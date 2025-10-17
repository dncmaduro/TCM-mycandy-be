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
import { TasksService } from "./tasks.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { CurrentUser } from "../auth/current-user.decorator"
import { TaskStatus, TaskPriority } from "../database/schemas/Task"

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async createTask(
    @Body()
    body: {
      title: string
      sprint: string
      description?: string
      parentTaskId?: string
      priority?: TaskPriority
      assignedTo?: string
      dueDate?: string
      tags?: string[]
    },
    @CurrentUser() user: { sub: string }
  ) {
    const task = await this.tasksService.createTask(
      {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined
      },
      user.sub
    )
    return { task }
  }

  @Patch(":id")
  async updateTask(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      assignedTo?: string
      dueDate?: string
      tags?: string[]
      sprint?: string
    },
    @CurrentUser() user: { sub: string }
  ) {
    const task = await this.tasksService.updateTask(
      id,
      {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined
      },
      user.sub
    )
    return { task }
  }

  @Delete(":id")
  async deleteTask(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string }
  ) {
    return this.tasksService.deleteTask(id, user.sub)
  }

  @Post(":id/assign")
  async assignTask(
    @Param("id") id: string,
    @Body() body: { assignedTo: string | null },
    @CurrentUser() user: { sub: string }
  ) {
    const task = await this.tasksService.assignTask(
      id,
      body.assignedTo,
      user.sub
    )
    return { task }
  }

  @Get("search")
  async searchTasks(
    @Query("searchText") searchText?: string,
    @Query("createdBy") createdBy?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("priority") priority?: TaskPriority,
    @Query("status") status?: TaskStatus,
    @Query("deleted") deleted?: string,
    @Query("tags") tags?: string,
    @Query("sprint") sprint?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const tagsArray = tags
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : undefined
    const deletedBool =
      deleted === "true" ? true : deleted === "false" ? false : undefined

    return this.tasksService.searchTasks({
      sprint,
      searchText,
      createdBy,
      assignedTo,
      priority,
      status,
      deleted: deletedBool,
      tags: tagsArray,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })
  }

  @Get(":id/subtasks")
  async getSubtasks(@Param("id") id: string) {
    const subtasks = await this.tasksService.getSubtasks(id)
    return { subtasks }
  }

  @Get(":id")
  async getTask(@Param("id") id: string) {
    const task = await this.tasksService.getTaskById(id)
    return { task }
  }
}
