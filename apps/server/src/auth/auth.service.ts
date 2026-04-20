import { Injectable, UnauthorizedException, ConflictException, HttpException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@imanifest/database";
import { RedisService } from "../common/redis.service";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";

const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
const RATE_LIMIT_MAX = 5; // max 5 attempts per window per IP
// Default to DB-first auth. Fallback is only enabled when explicitly set true.
const DEMO_AUTH_FALLBACK_ENABLED = process.env.DEMO_AUTH_FALLBACK_ENABLED === "true";

type DemoAuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async register(email: string, password: string, name?: string, ip?: string) {
    if (ip) await this.checkRateLimit(ip);

    try {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException("Email already registered");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: hashedPassword,
        },
      });

      const token = this.generateToken(user.id, user.email);
      return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Register failed on primary DB path: ${err instanceof Error ? err.message : err}`);
      return this.registerDemoUser(email, password, name);
    }
  }

  async login(email: string, password: string, ip?: string) {
    this.logger.log(`Login attempt for: ${email}`);
    if (ip) await this.checkRateLimit(ip);

    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new UnauthorizedException("Invalid credentials");
      }

      const token = this.generateToken(user.id, user.email);
      return { access_token: token, user: { id: user.id, email: user.email, name: user.name } };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Login failed on primary DB path: ${err instanceof Error ? err.message : err}`);
      return this.loginDemoUser(email, password);
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
  }

  /**
   * Blacklist a JWT token so it can no longer be used.
   * TTL matches the token's remaining lifetime.
   */
  async blacklistToken(rawToken: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(rawToken) as { exp?: number } | null;
      if (!decoded?.exp) return;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) return; // token already expired

      const tokenHash = this.hashToken(rawToken);
      await this.redis.set(`auth:blacklist:${tokenHash}`, "1", ttl);
      this.logger.log(`Token blacklisted for ${ttl}s`);
    } catch (err) {
      this.logger.warn("Failed to blacklist token — non-critical", err instanceof Error ? err.message : err);
    }
  }

  /**
   * Check if a raw token has been blacklisted.
   */
  async isTokenBlacklisted(rawToken: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(rawToken);
      const result = await this.redis.get(`auth:blacklist:${tokenHash}`);
      return result !== null;
    } catch {
      return false; // if Redis is down, allow the request
    }
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private demoUserId(email: string): string {
    return `demo-${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16)}`;
  }

  private async registerDemoUser(email: string, password: string, name?: string) {
    if (!DEMO_AUTH_FALLBACK_ENABLED) {
      throw new ServiceUnavailableException("Auth service is temporarily unavailable.");
    }

    const key = email.toLowerCase();
    // Check if already registered in Redis
    const existingKey = `auth:fallback:${key}`;
    const existing = await this.redis.get(existingKey);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const demoUser: DemoAuthUser = {
      id: this.demoUserId(email),
      email,
      name: name || email.split("@")[0],
      passwordHash,
    };

    // Store in Redis (30-day TTL so it persists across restarts)
    await this.redis.set(existingKey, JSON.stringify(demoUser), 30 * 24 * 60 * 60);
    this.logger.log(`Fallback user registered: ${email} (will persist for 30 days)`);

    const token = this.generateToken(demoUser.id, demoUser.email);
    return {
      access_token: token,
      user: { id: demoUser.id, email: demoUser.email, name: demoUser.name },
      mode: "demo-fallback",
    };
  }

  private async loginDemoUser(email: string, password: string) {
    if (!DEMO_AUTH_FALLBACK_ENABLED) {
      throw new ServiceUnavailableException("Auth service is temporarily unavailable.");
    }

    const key = email.toLowerCase();
    const existingKey = `auth:fallback:${key}`;
    const stored = await this.redis.get(existingKey);
    if (!stored) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const demoUser = JSON.parse(stored) as DemoAuthUser;
    const valid = await bcrypt.compare(password, demoUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.generateToken(demoUser.id, demoUser.email);
    return {
      access_token: token,
      user: { id: demoUser.id, email: demoUser.email, name: demoUser.name },
      mode: "demo-fallback",
    };
  }

  /**
   * Simple IP-based rate limiting using Redis INCR.
   */
  private async checkRateLimit(ip: string): Promise<void> {
    const key = `auth:ratelimit:${ip}`;
    try {
      const count = await this.redis.incr(key, RATE_LIMIT_WINDOW);
      if (count > RATE_LIMIT_MAX) {
        throw new HttpException(
          { statusCode: 429, message: `Too many auth attempts. Try again later.` },
          429,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn("Rate limit check failed — allowing request", err instanceof Error ? err.message : err);
    }
  }
}