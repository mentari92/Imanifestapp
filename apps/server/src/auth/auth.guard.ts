import { Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";

export const IS_PUBLIC_KEY = "isPublic";
const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";

@Injectable()
export class JwtAuthGuard extends PassportAuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (AUTH_DISABLED) {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: "demo-user-hackathon",
        email: "demo@imanifestapp.com",
      };
      return true;
    }

    return super.canActivate(context);
  }
}