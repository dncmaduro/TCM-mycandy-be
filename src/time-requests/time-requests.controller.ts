import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from "@nestjs/common"
import { TimeRequestsService } from "./time-requests.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { RolesGuard } from "../auth/roles.guard"
import { Roles } from "../auth/roles.decorator"
import { CurrentUser } from "../auth/current-user.decorator"
import {
  TimeRequestType,
  TimeRequestStatus
} from "../database/schemas/TimeRequest"

@Controller("time-requests")
@UseGuards(JwtAuthGuard)
export class TimeRequestsController {
  constructor(private readonly timeRequestsService: TimeRequestsService) {}

  @Post()
  async createRequest(
    @Body()
    body: {
      type: TimeRequestType
      reason: string
      minutes?: number
      date: string
    },
    @CurrentUser() user: { profileId: string }
  ) {
    const request = await this.timeRequestsService.createRequest(
      {
        type: body.type,
        reason: body.reason,
        minutes: body.minutes,
        date: new Date(body.date)
      },
      user.profileId
    )
    return { request }
  }

  @Patch(":id")
  async updateRequest(
    @Param("id") id: string,
    @Body()
    body: {
      type?: TimeRequestType
      reason?: string
      minutes?: number
      date?: string
    },
    @CurrentUser() user: { profileId: string }
  ) {
    const request = await this.timeRequestsService.updateRequest(
      id,
      {
        type: body.type,
        reason: body.reason,
        minutes: body.minutes,
        date: body.date ? new Date(body.date) : undefined
      },
      user.profileId
    )
    return { request }
  }

  @Get("my")
  async getOwnRequests(
    @CurrentUser() user: { profileId: string },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("deleted") deleted?: string
  ) {
    const deletedBool =
      deleted === "true" ? true : deleted === "false" ? false : undefined

    return this.timeRequestsService.getOwnRequests(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        deleted: deletedBool
      },
      user.profileId
    )
  }

  @Get("pending-review")
  async getPendingRequestsForReviewer(
    @CurrentUser() user: { profileId: string },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string
  ) {
    return this.timeRequestsService.getPendingRequestsForReviewer(
      user.profileId,
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        status
      }
    )
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("admin", "superadmin")
  async getAllRequests(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("date") date?: string,
    @Query("status") status?: TimeRequestStatus
  ) {
    return this.timeRequestsService.getAllRequests({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      date: date ? new Date(date) : undefined,
      status
    })
  }

  @Post(":id/approve")
  async approveRequest(
    @Param("id") id: string,
    @CurrentUser() user: { profileId: string }
  ) {
    return this.timeRequestsService.reviewRequest(id, "approve", user.profileId)
  }

  @Post(":id/reject")
  async rejectRequest(
    @Param("id") id: string,
    @CurrentUser() user: { profileId: string }
  ) {
    return this.timeRequestsService.reviewRequest(id, "reject", user.profileId)
  }

  @Delete(":id")
  async deleteRequest(
    @Param("id") id: string,
    @CurrentUser() user: { profileId: string }
  ) {
    return this.timeRequestsService.deleteRequest(id, user.profileId)
  }

  @Get(":id")
  async getRequest(@Param("id") id: string) {
    const request = await this.timeRequestsService.getRequestById(id)
    return { request }
  }

  @Get("month/:month/year/:year")
  async getOwnRequestsByMonth(
    @Param("month") month: string,
    @Param("year") year: string,
    @CurrentUser() user: { profileId: string }
  ) {
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)

    return this.timeRequestsService.getOwnRequestsByMonth(
      monthNum,
      yearNum,
      user.profileId
    )
  }
}
