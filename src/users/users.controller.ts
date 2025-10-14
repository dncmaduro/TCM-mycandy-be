import {
  Controller,
  Get,
  UseGuards,
  Post,
  Param,
  Body,
  Query
} from "@nestjs/common"
import { UsersService } from "./users.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { CurrentUser } from "../auth/current-user.decorator"
import { Roles } from "../auth/roles.decorator"
import { RolesGuard } from "../auth/roles.guard"
import { Role } from "../database/schemas/RoleUser"

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { sub: string }) {
    const doc = await this.usersService.findByIdLean(user.sub)
    return { user: doc }
  }

  @Get("search")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("superadmin")
  async search(
    @Query("searchText") searchText?: string,
    @Query("role") role?: "user" | "admin" | "superadmin",
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const res = await this.usersService.searchUsers({
      searchText,
      role: role as Role,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })
    return res
  }

  @Get("public/search")
  async searchPublic(
    @Query("searchText") searchText?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const res = await this.usersService.searchUsersPublic({
      searchText,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })
    return res
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getById(@Param("id") id: string) {
    const user = await this.usersService.findByIdLean(id)
    return { user }
  }

  @Post(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("superadmin")
  async approve(@Param("id") id: string, @CurrentUser() user: { sub: string }) {
    const doc = await this.usersService.approveUser(id, user.sub)
    return { user: doc }
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("superadmin")
  async reject(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { sub: string }
  ) {
    const doc = await this.usersService.rejectUser(
      id,
      body?.reason || "",
      user.sub
    )
    return { user: doc }
  }

  @Post(":id/suspend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("superadmin")
  async suspend(@Param("id") id: string, @CurrentUser() user: { sub: string }) {
    const doc = await this.usersService.suspendUser(id, user.sub)
    return { user: doc }
  }
}
