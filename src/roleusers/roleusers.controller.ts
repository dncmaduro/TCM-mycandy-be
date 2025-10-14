import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common"
import { RoleUsersService } from "./roleusers.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { RolesGuard } from "../auth/roles.guard"
import { Roles } from "../auth/roles.decorator"
import { Role } from "../database/schemas/RoleUser"
import { CurrentUser } from "../auth/current-user.decorator"

@Controller("roleusers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("superadmin")
export class RoleUsersController {
  constructor(private readonly roleUsersService: RoleUsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @Roles()
  async getOwnRole(@CurrentUser() user: { sub: string }) {
    const role = await this.roleUsersService.getRole(user.sub)
    return { userId: user.sub, role }
  }

  @Get(":userId")
  async getRole(@Param("userId") userId: string) {
    const role = await this.roleUsersService.getRole(userId)
    return { userId, role }
  }

  @Post(":userId")
  async setRole(@Param("userId") userId: string, @Body() body: { role: Role }) {
    const role = await this.roleUsersService.setRole(userId, body.role)
    return { userId, role }
  }

  @Delete(":userId")
  async removeRole(@Param("userId") userId: string) {
    const res = await this.roleUsersService.removeRole(userId)
    return { userId, ...res }
  }
}
