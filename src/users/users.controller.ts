import { Controller, Get, UseGuards } from "@nestjs/common"
import { UsersService } from "./users.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { CurrentUser } from "../auth/current-user.decorator"

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { sub: string }) {
    const doc = await this.usersService.findByIdLean(user.sub)
    return { user: doc }
  }
}
