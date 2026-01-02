import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { TaskLog, TaskLogType } from "../database/schemas/TaskLog"

export interface CreateTaskLogDto {
  taskId: string
  type: TaskLogType
  userId: string
  meta?: Record<string, any>
}

export interface SearchTaskLogsDto {
  taskId?: string
  userId?: string
  type?: TaskLogType
  startTime?: string // ISO date string
  endTime?: string // ISO date string
  page?: number
  limit?: number
}

@Injectable()
export class TaskLogsService {
  constructor(@InjectModel("TaskLog") private taskLogModel: Model<TaskLog>) {}

  /**
   * 1. Tạo log mới
   */
  async createLog(dto: CreateTaskLogDto) {
    const log = await this.taskLogModel.create({
      taskId: new Types.ObjectId(dto.taskId),
      type: dto.type,
      userId: new Types.ObjectId(dto.userId),
      meta: dto.meta
    })

    return {
      log: log.toObject()
    }
  }

  /**
   * 2. Search logs với filters
   * Filter theo: taskId, userId, type, startTime-endTime của createdAt
   */
  async searchLogs(dto: SearchTaskLogsDto) {
    const page = dto.page || 1
    const limit = Math.min(dto.limit || 20, 100)
    const skip = (page - 1) * limit

    // Build filter
    const filter: any = {}

    if (dto.taskId) {
      filter.taskId = new Types.ObjectId(dto.taskId)
    }

    if (dto.userId) {
      filter.userId = new Types.ObjectId(dto.userId)
    }

    if (dto.type) {
      filter.type = dto.type
    }

    // Filter theo time range
    if (dto.startTime || dto.endTime) {
      filter.createdAt = {}
      if (dto.startTime) {
        filter.createdAt.$gte = new Date(dto.startTime)
      }
      if (dto.endTime) {
        filter.createdAt.$lte = new Date(dto.endTime)
      }
    }

    // Query với populate user và task info
    const [logs, total] = await Promise.all([
      this.taskLogModel
        .find(filter)
        .populate("userId", "name avatarUrl")
        .populate("taskId", "title status")
        .populate("meta.assignedTo", "name avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.taskLogModel.countDocuments(filter)
    ])

    return {
      data: logs,
      totalPages: Math.ceil(total / limit)
    }
  }
}
