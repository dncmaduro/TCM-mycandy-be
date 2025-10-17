import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { Sprint } from "../database/schemas/Sprint"
import { Task } from "../database/schemas/Task"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type CreateSprintInput = {
  name: string
  startDate: Date
  endDate: Date
}

type GetSprintsInput = {
  limit?: number
}

@Injectable()
export class SprintsService {
  constructor(
    @InjectModel("Sprint") private readonly sprintModel: Model<Sprint>,
    @InjectModel("Task") private readonly taskModel: Model<Task>
  ) {}

  async createSprint(input: CreateSprintInput): Promise<Lean<Sprint>> {
    // Validate dates
    if (input.startDate >= input.endDate) {
      throw new BadRequestException("Ngày bắt đầu phải nhỏ hơn ngày kết thúc")
    }

    const sprintData = {
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      updatedAt: new Date()
    }

    try {
      const sprint = await this.sprintModel.create(sprintData)
      return sprint.toObject() as Lean<Sprint>
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new BadRequestException("Tên sprint đã tồn tại")
      }
      throw error
    }
  }

  async deleteSprint(id: string): Promise<{ message: string }> {
    const sprint = await this.sprintModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!sprint) {
      throw new NotFoundException("Không tìm thấy sprint")
    }

    return { message: "Xóa sprint thành công" }
  }

  async restoreSprint(id: string): Promise<{ message: string }> {
    const sprint = await this.sprintModel.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      {
        deletedAt: null,
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!sprint) {
      throw new NotFoundException("Không tìm thấy sprint đã xóa")
    }

    return { message: "Khôi phục sprint thành công" }
  }

  async getSprints(input: GetSprintsInput): Promise<{ data: Lean<Sprint>[] }> {
    const limit = input.limit ? Math.min(100, Math.max(1, input.limit)) : 20

    const sprints = await this.sprintModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<Lean<Sprint>[]>()
      .exec()

    return { data: sprints }
  }

  async getSprintById(sprintId: string): Promise<Lean<Sprint> | null> {
    if (!Types.ObjectId.isValid(sprintId)) return null
    return this.sprintModel
      .findOne({ _id: sprintId, deletedAt: null })
      .lean<Lean<Sprint>>()
      .exec()
  }

  async getCurrentSprint(): Promise<{
    sprint: Lean<Sprint> | null
    taskStats: {
      new: number
      in_progress: number
      reviewing: number
      completed: number
      total: number
    }
  }> {
    const sprint = await this.sprintModel
      .findOne({ isCurrent: true, deletedAt: null })
      .lean<Lean<Sprint>>()
      .exec()

    if (!sprint) {
      return {
        sprint: null,
        taskStats: {
          new: 0,
          in_progress: 0,
          reviewing: 0,
          completed: 0,
          total: 0
        }
      }
    }

    // Thống kê task theo status
    const pipeline = [
      {
        $match: {
          sprint: sprint._id,
          deletedAt: null
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]

    const result = await this.taskModel.aggregate(pipeline).exec()

    const taskStats = {
      new: 0,
      in_progress: 0,
      reviewing: 0,
      completed: 0,
      total: 0
    }
    result.forEach((item: any) => {
      if (item._id in taskStats && item._id !== "total") {
        taskStats[item._id as keyof Omit<typeof taskStats, "total">] =
          item.count
        taskStats.total += item.count
      }
    })

    return { sprint, taskStats }
  }

  async setCurrentSprint(sprintId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(sprintId)) {
      throw new BadRequestException("Sprint ID không hợp lệ")
    }

    // Kiểm tra sprint tồn tại
    const sprint = await this.sprintModel
      .findOne({
        _id: sprintId,
        deletedAt: null
      })
      .exec()

    if (!sprint) {
      throw new NotFoundException("Không tìm thấy sprint")
    }

    // Set tất cả sprint khác thành không current
    await this.sprintModel
      .updateMany(
        { isCurrent: true },
        { isCurrent: false, updatedAt: new Date() }
      )
      .exec()

    // Set sprint được chọn thành current
    await this.sprintModel
      .findByIdAndUpdate(sprintId, { isCurrent: true, updatedAt: new Date() })
      .exec()

    return { message: "Đã cập nhật sprint hiện tại" }
  }

  async moveTasksToNewSprint(
    newSprintId: string
  ): Promise<{ message: string; movedTasks: number }> {
    if (!Types.ObjectId.isValid(newSprintId)) {
      throw new BadRequestException("Sprint ID không hợp lệ")
    }

    // Kiểm tra sprint mới tồn tại
    const newSprint = await this.sprintModel
      .findOne({
        _id: newSprintId,
        deletedAt: null
      })
      .exec()

    if (!newSprint) {
      throw new NotFoundException("Không tìm thấy sprint")
    }

    // Lấy sprint hiện tại
    const currentSprint = await this.sprintModel
      .findOne({ isCurrent: true, deletedAt: null })
      .exec()

    if (!currentSprint) {
      throw new NotFoundException("Không có sprint hiện tại")
    }

    if (currentSprint._id.toString() === newSprintId) {
      throw new BadRequestException("Sprint được chọn đã là sprint hiện tại")
    }

    // Di chuyển các task chưa hoàn thành sang sprint mới
    const moveResult = await this.taskModel
      .updateMany(
        {
          sprint: currentSprint._id,
          status: { $in: ["new", "in_progress", "reviewing"] },
          deletedAt: null
        },
        {
          sprint: new Types.ObjectId(newSprintId),
          updatedAt: new Date()
        }
      )
      .exec()

    // Set sprint hiện tại thành false
    await this.sprintModel
      .findByIdAndUpdate(currentSprint._id, {
        isCurrent: false,
        updatedAt: new Date()
      })
      .exec()

    // Set sprint mới thành current
    await this.sprintModel
      .findByIdAndUpdate(newSprintId, {
        isCurrent: true,
        updatedAt: new Date()
      })
      .exec()

    return {
      message: "Đã di chuyển task và cập nhật sprint hiện tại",
      movedTasks: moveResult.modifiedCount
    }
  }
}
