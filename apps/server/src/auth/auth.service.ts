import { Injectable, UnauthorizedException, ConflictException, HttpException, Logger, ServiceUnavailableException, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@imanifest/database";
import { RedisService } from "../common/redis.service";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import axios from "axios";

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

type OauthExchangePayload = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
};

type OauthUserProfile = {
  email: string;
  name: string;
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

  async getOauthStartUrl(): Promise<string> {
    const cfg = this.getOauthConfig();
    const state = randomBytes(24).toString("hex");

    // PKCE (RFC 7636) + nonce (OIDC)
    const codeVerifier = this.base64UrlEncode(randomBytes(32));
    const codeChallenge = this.base64UrlEncode(
      createHash("sha256").update(codeVerifier).digest(),
    );
    const nonce = this.base64UrlEncode(randomBytes(16));

    await this.redis.set(
      `auth:oauth:flow:${state}`,
      JSON.stringify({ codeVerifier, nonce }),
      10 * 60,
    );

    const authorizeUrl = new URL(`${cfg.oauthBaseUrl}/oauth2/auth`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", cfg.clientId);
    authorizeUrl.searchParams.set("redirect_uri", cfg.redirectUri);
    authorizeUrl.searchParams.set("scope", cfg.scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("nonce", nonce);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return authorizeUrl.toString();
  }

  async handleOauthCallback(code: string, state: string): Promise<string> {
    const cfg = this.getOauthConfig();
    const safeErrorRedirect = (message: string) => {
      const url = new URL(cfg.successRedirect);
      url.searchParams.set("oauth_error", message);
      return url.toString();
    };

    try {
      const flowKey = `auth:oauth:flow:${state}`;
      const flowJson = await this.redis.get(flowKey);
      if (!flowJson) {
        return safeErrorRedirect("invalid_state");
      }

      await this.redis.del(flowKey);

      let flow: { codeVerifier?: string; nonce?: string } = {};
      try {
        flow = JSON.parse(flowJson) as { codeVerifier?: string; nonce?: string };
      } catch {
        return safeErrorRedirect("invalid_state");
      }

      const codeVerifier = typeof flow.codeVerifier === "string" ? flow.codeVerifier : "";
      const expectedNonce = typeof flow.nonce === "string" ? flow.nonce : "";
      if (!codeVerifier) {
        return safeErrorRedirect("pkce_missing");
      }

      const form = new URLSearchParams();
      form.set("grant_type", "authorization_code");
      form.set("code", code);
      form.set("redirect_uri", cfg.redirectUri);
      form.set("code_verifier", codeVerifier);

      const tokenResp = await axios.post<OauthExchangePayload>(
        `${cfg.oauthBaseUrl}/oauth2/token`,
        form.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          auth: {
            username: cfg.clientId,
            password: cfg.clientSecret,
          },
          timeout: 10000,
        },
      );

      const quranAccessToken = tokenResp.data?.access_token || "";
      if (!quranAccessToken) {
        return safeErrorRedirect("token_exchange_failed");
      }

      // If the provider returned an id_token (OIDC), validate nonce claim matches.
      const idToken = tokenResp.data?.id_token || "";
      const idTokenPayload = idToken ? this.decodeJwtPayload(idToken) : null;
      if (idTokenPayload && expectedNonce) {
        const receivedNonce =
          typeof idTokenPayload.nonce === "string" ? idTokenPayload.nonce : "";
        if (!receivedNonce || receivedNonce !== expectedNonce) {
          return safeErrorRedirect("invalid_nonce");
        }
      }

      const idTokenEmail =
        idTokenPayload && typeof idTokenPayload.email === "string" ? idTokenPayload.email : "";
      const idTokenName =
        idTokenPayload && typeof idTokenPayload.name === "string" ? idTokenPayload.name : "";
      const idTokenSub =
        idTokenPayload && typeof idTokenPayload.sub === "string" ? idTokenPayload.sub : "";

      const profile = idTokenEmail
        ? { email: idTokenEmail, name: idTokenName || "Quran.com User" }
        : await this.resolveOauthProfile(quranAccessToken, idTokenSub);

      const user = await this.prisma.user.upsert({
        where: { email: profile.email },
        create: {
          email: profile.email,
          name: profile.name,
          // OAuth users can authenticate with provider token; no local password required.
          password: null,
          quranApiKey: quranAccessToken,
        },
        update: {
          name: profile.name,
          quranApiKey: quranAccessToken,
        },
      });

      const accessToken = this.generateToken(user.id, user.email);
      const loginCode = randomBytes(24).toString("hex");
      await this.redis.set(
        `auth:oauth:login:${loginCode}`,
        JSON.stringify({
          access_token: accessToken,
          user: { id: user.id, email: user.email, name: user.name },
        }),
        120,
      );

      const redirectUrl = new URL(cfg.successRedirect);
      redirectUrl.searchParams.set("oauth_code", loginCode);
      return redirectUrl.toString();
    } catch (error) {
      this.logger.warn(
        `OAuth callback failed: ${error instanceof Error ? error.message : error}`,
      );
      return safeErrorRedirect("oauth_callback_failed");
    }
  }

  async exchangeOauthLoginCode(code: string) {
    if (!code?.trim()) {
      throw new BadRequestException("OAuth code is required");
    }

    const key = `auth:oauth:login:${code.trim()}`;
    const payload = await this.redis.get(key);
    if (!payload) {
      throw new UnauthorizedException("OAuth code is invalid or expired");
    }

    await this.redis.del(key);
    return JSON.parse(payload) as {
      access_token: string;
      user: { id: string; email: string; name: string | null };
    };
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

  private getOauthConfig() {
    const oauthBaseUrl = process.env.QURAN_FOUNDATION_OAUTH_BASE_URL || "";
    const clientId = process.env.QURAN_FOUNDATION_CLIENT_ID || "";
    const clientSecret = process.env.QURAN_FOUNDATION_CLIENT_SECRET || "";
    const redirectUri = process.env.QURAN_FOUNDATION_OAUTH_REDIRECT_URI || "";
    const successRedirect =
      process.env.QURAN_FOUNDATION_OAUTH_SUCCESS_REDIRECT || "";
    const scope =
      process.env.QURAN_FOUNDATION_OAUTH_SCOPE ||
      "openid offline_access user collection";

    if (!oauthBaseUrl || !clientId || !clientSecret || !redirectUri || !successRedirect) {
      throw new ServiceUnavailableException(
        "OAuth is not configured. Missing required Quran Foundation OAuth environment variables.",
      );
    }

    return {
      oauthBaseUrl: oauthBaseUrl.replace(/\/$/, ""),
      clientId,
      clientSecret,
      redirectUri,
      successRedirect,
      scope,
    };
  }

  private async resolveOauthProfile(
    accessToken: string,
    subjectHint?: string,
  ): Promise<OauthUserProfile> {
    const profileUrl = process.env.QURAN_FOUNDATION_OAUTH_USERINFO_URL || "";
    if (!profileUrl) {
      const stableId = subjectHint?.trim()
        ? createHash("sha256").update(subjectHint.trim()).digest("hex").slice(0, 20)
        : createHash("sha256").update(accessToken).digest("hex").slice(0, 20);
      const syntheticEmail = `oauth-${stableId}@quran.foundation`;
      return { email: syntheticEmail, name: "Quran.com User" };
    }

    try {
      const response = await axios.get<Record<string, unknown>>(profileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 8000,
      });

      const body = response.data || {};
      const email =
        this.pickString(body, ["email", "user_email", "mail"]) ||
        `oauth-${(subjectHint?.trim()
          ? createHash("sha256").update(subjectHint.trim()).digest("hex")
          : createHash("sha256").update(accessToken).digest("hex")
        ).slice(0, 20)}@quran.foundation`;
      const name =
        this.pickString(body, ["name", "full_name", "username", "preferred_username"]) ||
        "Quran.com User";

      return { email, name };
    } catch (error) {
      this.logger.warn(
        `OAuth userinfo lookup failed: ${error instanceof Error ? error.message : error}`,
      );

      const stableId = subjectHint?.trim()
        ? createHash("sha256").update(subjectHint.trim()).digest("hex").slice(0, 20)
        : createHash("sha256").update(accessToken).digest("hex").slice(0, 20);
      const syntheticEmail = `oauth-${stableId}@quran.foundation`;
      return { email: syntheticEmail, name: "Quran.com User" };
    }
  }

  private base64UrlEncode(input: Buffer | string): string {
    const raw = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input).toString("base64");
    return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const payloadB64Url = parts[1] || "";

      const padded = payloadB64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payloadB64Url.length / 4) * 4, "=");

      const json = Buffer.from(padded, "base64").toString("utf8");
      const parsed = JSON.parse(json) as Record<string, unknown>;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  private pickString(obj: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return null;
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

  /**
   * Generate a password reset token and store it in DB.
   * In production, this token would be sent via email.
   * For hackathon: token is returned in response so demo still works.
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return same message to prevent user enumeration
    const genericMessage = "If that email is registered, a reset link has been sent.";

    if (!user) {
      return { message: genericMessage };
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: rawToken,
        expiresAt,
      },
    });

    this.logger.log(`Password reset token generated for user: ${user.id}`);

    // TODO: Replace with actual email sending when SMTP is configured
    // For hackathon demo, return token in response
    const isProduction = process.env.NODE_ENV === "production" && process.env.SMTP_HOST;
    if (isProduction) {
      // await this.emailService.sendResetEmail(user.email, rawToken);
      return { message: genericMessage };
    }

    return {
      message: genericMessage,
      resetToken: rawToken, // Remove this once SMTP is configured
    };
  }

  /**
   * Reset password using a valid token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { token },
        data: { used: true },
      }),
    ]);

    this.logger.log(`Password reset successful for user: ${resetRecord.userId}`);
    return { message: "Password reset successfully. Please log in with your new password." };
  }
}