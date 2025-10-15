import { Controller, Get, Query, Redirect, Post, Body } from "@nestjs/common"
import { AuthService } from "./auth.service"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("google/callback")
  @Redirect() // status 302 default
  async googleAuth(@Query("code") code: string) {
    const { redirectUrl } = await this.authService.handleGoogleCallback(code)
    return { url: redirectUrl }
  }

  @Post("refresh")
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body.refreshToken)
  }

  @Post("logout")
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken)
  }

  @Post("validate")
  async validateToken(@Body() body: { accessToken: string }) {
    return this.authService.validateAccessToken(body.accessToken)
  }
}
