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
import { TaskTagsService } from "./tasktags.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"

@Controller("task-tags")
@UseGuards(JwtAuthGuard)
export class TaskTagsController {
  constructor(private readonly taskTagsService: TaskTagsService) {}

  @Post()
  async createTag(@Body() body: { name: string; color?: string }) {
    const tag = await this.taskTagsService.createTag(body)
    return { tag }
  }

  @Patch(":id")
  async updateTag(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string
      color?: string
    }
  ) {
    const tag = await this.taskTagsService.updateTag(id, body)
    return { tag }
  }

  @Delete(":id")
  async deleteTag(@Param("id") id: string) {
    return this.taskTagsService.deleteTag(id)
  }

  @Get("search")
  async searchTags(
    @Query("searchText") searchText?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("deleted") deleted?: string
  ) {
    let deletedFilter: boolean | undefined
    if (deleted === "true") {
      deletedFilter = true
    } else if (deleted === "false") {
      deletedFilter = false
    }
    // If deleted is not provided or invalid, search all

    return this.taskTagsService.searchTags({
      searchText,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      deleted: deletedFilter
    })
  }

  @Get("all")
  async getAllTags() {
    return this.taskTagsService.getAllTags()
  }

  @Get("all-include-deleted")
  async getAllTagsIncludeDeleted() {
    return this.taskTagsService.getAllTagsIncludeDeleted()
  }

  @Patch(":id/restore")
  async restoreTag(@Param("id") id: string) {
    return this.taskTagsService.restoreTag(id)
  }

  @Get(":id")
  async getTag(@Param("id") id: string) {
    const tag = await this.taskTagsService.getTagById(id)
    return { tag }
  }
}
