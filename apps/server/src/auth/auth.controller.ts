import { Controller, Post, Body, HttpCode, HttpStatus, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
    return this.authService.register(dto.email, dto.password, dto.name, ip);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.socket?.remoteAddress;
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