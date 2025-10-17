import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { Sprint } from "../database/schemas/Sprint"

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
    @InjectModel("Sprint") private readonly sprintModel: Model<Sprint>
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
}
