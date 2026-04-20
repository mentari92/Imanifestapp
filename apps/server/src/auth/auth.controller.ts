import { Controller, Post, Body, HttpCode, HttpStatus, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  private getClientIp(req: any): string | undefined {
    const cfIp = req.headers?.["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

    const xff = req.headers?.["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
      const firstIp = xff.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }

    const ip = req.ip || req.socket?.remoteAddress;
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
      return ip.slice(7);
    }

    return ip;
  }

  @Public()
  @Post("register")
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = this.getClientIp(req);
    return this.authService.register(dto.email, dto.password, dto.name, ip);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = this.getClientIp(req);
    return this.authService.login(dto.email, dto.password, ip);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const rawToken = authHeader.substring(7);
      await this.authService.blacklistToken(rawToken);
    }
    return { message: "Logged out successfully" };
  }
}