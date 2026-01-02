import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request
} from "@nestjs/common"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import {
  TaskLogsService,
  CreateTaskLogDto,
  SearchTaskLogsDto
} from "./task-logs.service"
import { CurrentUser } from "../auth/current-user.decorator"

@Controller("task-logs")
@UseGuards(JwtAuthGuard)
export class TaskLogsController {
  constructor(private readonly taskLogsService: TaskLogsService) {}

  /**
   * 1. Tạo log mới
   * POST /task-logs
   */
  @Post()
  async createLog(
    @Body() dto: CreateTaskLogDto,
    @CurrentUser() user: { sub: string }
  ) {
    // Nếu không có userId trong body, dùng user từ JWT token
    if (!dto.userId) {
      dto.userId = user.sub
    }
    return this.taskLogsService.createLog(dto)
  }

  /**
   * 2. Search logs với filters
   * GET /task-logs?taskId=xxx&userId=xxx&type=xxx&startTime=xxx&endTime=xxx&page=1&limit=20
   */
  @Get()
  async searchLogs(@Query() query: SearchTaskLogsDto) {
    return this.taskLogsService.searchLogs(query)
  }
}
