import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get, Query, Res, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

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

  @Public()
  @Get("oauth/start")
  async oauthStart(@Res() res: any) {
    const url = await this.authService.getOauthStartUrl();
    return res.redirect(url);
  }

  @Public()
  @Get([
    "oauth/callback",
    "oauth/callback/",
    "quran-callback",
    "quran-callback/",
    // Exact path registered with Quran Foundation OAuth client:
    // https://imanifestapp.com/api/auth/callback/qurancom
    // nginx strips /api/ prefix, so NestJS receives /auth/callback/qurancom
    "callback/qurancom",
    "callback/qurancom/",
  ])
  async oauthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: any,
  ) {
    if (!code || !state) {
      throw new BadRequestException("Missing OAuth callback parameters");
    }

    const redirectUrl = await this.authService.handleOauthCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Public()
  @Post("oauth/exchange")
  @HttpCode(HttpStatus.OK)
  async oauthExchange(@Body("code") code: string) {
    return this.authService.exchangeOauthLoginCode(code);
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

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}