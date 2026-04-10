import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  async register(
    @Body("email") email: string,
    @Body("password") password: string,
    @Body("name") name?: string,
  ) {
    return this.authService.register(email, password, name);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body("email") email: string,
    @Body("password") password: string,
  ) {
    return this.authService.login(email, password);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout() {
    // JWT is stateless — client clears token from SecureStore
    // In production: add token to Redis blacklist
    return { message: "Logged out successfully" };
  }
}
