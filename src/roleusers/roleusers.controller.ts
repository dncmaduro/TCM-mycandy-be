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
  async getOwnRoles(@CurrentUser() user: { profileId: string }) {
    const roles = await this.roleUsersService.getRoles(user.profileId)
    return { profileId: user.profileId, roles }
  }

  @Get(":profileId")
  async getRoles(@Param("profileId") profileId: string) {
    const roles = await this.roleUsersService.getRoles(profileId)
    return { profileId, roles }
  }

  @Post(":profileId/add-role")
  async addRole(
    @Param("profileId") profileId: string,
    @Body() body: { role: Role }
  ) {
    const roles = await this.roleUsersService.setRole(profileId, body.role)
    return { profileId, roles }
  }

  @Post(":profileId/set-roles")
  async setRoles(
    @Param("profileId") profileId: string,
    @Body() body: { roles: Role[] }
  ) {
    const roles = await this.roleUsersService.setRoles(profileId, body.roles)
    return { profileId, roles }
  }

  @Delete(":profileId/:role")
  async removeRole(
    @Param("profileId") profileId: string,
    @Param("role") role: Role
  ) {
    const res = await this.roleUsersService.removeRole(profileId, role)
    return { profileId, ...res }
  }

  @Delete(":profileId")
  async removeAllRoles(@Param("profileId") profileId: string) {
    const res = await this.roleUsersService.removeRole(profileId)
    return { profileId, ...res }
  }
}
