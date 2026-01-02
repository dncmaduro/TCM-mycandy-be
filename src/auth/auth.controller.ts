import { Controller, Post, Body, UseGuards } from "@nestjs/common"
import { AuthService } from "./auth.service"
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto
} from "./dto/auth.dto"
import { JwtAuthGuard } from "./jwt-auth.guard"
import { CurrentUser } from "./current-user.decorator"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password, body.name)
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password)
  }

  @Post("refresh")
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refreshToken)
  }

  @Post("logout")
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body.refreshToken)
  }

  @Post("validate")
  async validateToken(@Body() body: { accessToken: string }) {
    return this.authService.validateAccessToken(body.accessToken)
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: ChangePasswordDto
  ) {
    return this.authService.changePassword(
      user.sub,
      body.oldPassword,
      body.newPassword
    )
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email)
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword)
  }
}
