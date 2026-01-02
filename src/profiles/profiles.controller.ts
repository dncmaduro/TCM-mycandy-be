import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Query
} from "@nestjs/common"
import { ProfilesService } from "./profiles.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { RolesGuard } from "../auth/roles.guard"
import { Roles } from "../auth/roles.decorator"
import { CurrentUser } from "../auth/current-user.decorator"

@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: any) {
    const profile = await this.profilesService.getProfileById(user.profileId)
    if (!profile) {
      throw new BadRequestException("Profile không tồn tại")
    }
    return profile
  }

  @Get("public-search")
  @UseGuards(JwtAuthGuard)
  async publicSearchProfiles(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("searchText") searchText?: string
  ) {
    return this.profilesService.publicSearchProfiles({
      page,
      limit,
      searchText
    })
  }

  @Get("admin-search")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("superadmin")
  async adminSearchProfiles(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("searchText") searchText?: string,
    @Query("role") role?: string,
    @Query("status") status?: string
  ) {
    return this.profilesService.adminSearchProfiles({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      searchText,
      role,
      status
    })
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param("id") id: string) {
    const profile = await this.profilesService.getProfileById(id)
    if (!profile) {
      throw new BadRequestException("Profile không tồn tại")
    }
    return profile
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() body: { name?: string; avatarUrl?: string }
  ) {
    const profile = await this.profilesService.updateProfile(
      user.profileId,
      body
    )
    if (!profile) {
      throw new BadRequestException("Cập nhật profile thất bại")
    }
    return profile
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "superadmin")
  async getAllProfiles(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("status") status?: string
  ) {
    return this.profilesService.getAllProfiles({ page, limit, status })
  }

  @Patch(":id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "superadmin")
  async approveProfile(@Param("id") id: string, @CurrentUser() user: any) {
    const profile = await this.profilesService.approveProfile(
      id,
      user.profileId
    )
    if (!profile) {
      throw new BadRequestException("Phê duyệt profile thất bại")
    }
    return profile
  }

  @Patch(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "superadmin")
  async rejectProfile(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any
  ) {
    const profile = await this.profilesService.rejectProfile(
      id,
      body.reason,
      user.profileId
    )
    if (!profile) {
      throw new BadRequestException("Từ chối profile thất bại")
    }
    return profile
  }

  @Patch(":id/suspend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "superadmin")
  async suspendProfile(@Param("id") id: string) {
    const profile = await this.profilesService.suspendProfile(id)
    if (!profile) {
      throw new BadRequestException("Tạm ngưng profile thất bại")
    }
    return profile
  }
}
