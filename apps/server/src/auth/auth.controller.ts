import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout() {
    // JWT is stateless — client clears token from SecureStore
    // In production: add token to Redis blacklist
    return { message: "Logged out successfully" };
  }
}