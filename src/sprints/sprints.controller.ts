import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch
} from "@nestjs/common"
import { SprintsService } from "./sprints.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { RolesGuard } from "../auth/roles.guard"
import { Roles } from "../auth/roles.decorator"

@Controller("sprints")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "superadmin")
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  async createSprint(
    @Body()
    body: {
      name: string
      startDate: string
      endDate: string
    }
  ) {
    const sprint = await this.sprintsService.createSprint({
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate)
    })
    return { sprint }
  }

  @Delete(":id")
  async deleteSprint(@Param("id") id: string) {
    return this.sprintsService.deleteSprint(id)
  }

  @Patch(":id/restore")
  async restoreSprint(@Param("id") id: string) {
    return this.sprintsService.restoreSprint(id)
  }

  @Get()
  async getSprints(@Query("limit") limit?: string) {
    return this.sprintsService.getSprints({
      limit: limit ? parseInt(limit, 10) : undefined
    })
  }

  @Get(":id")
  async getSprint(@Param("id") id: string) {
    const sprint = await this.sprintsService.getSprintById(id)
    return { sprint }
  }
}
