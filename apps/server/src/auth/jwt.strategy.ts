import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "./auth.service";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable is not set. Refusing to start with insecure defaults.",
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: { headers: { authorization?: string } }, payload: { sub: string; email: string }) {
    // Check JWT blacklist — reject if token was explicitly logged out
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const rawToken = authHeader.substring(7);
      const blacklisted = await this.authService.isTokenBlacklisted(rawToken);
      if (blacklisted) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }

    return { userId: payload.sub, email: payload.email };
  }
}