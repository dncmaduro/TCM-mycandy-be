import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { TaskTag } from "../database/schemas/TaskTag"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type CreateTagInput = {
  name: string
  color?: string
}

type UpdateTagInput = {
  name?: string
  color?: string
}

type SearchTagsInput = {
  searchText?: string
  page?: number
  limit?: number
  deleted?: boolean
}

@Injectable()
export class TaskTagsService {
  constructor(
    @InjectModel("TaskTag") private readonly taskTagModel: Model<TaskTag>
  ) {}

  async createTag(input: CreateTagInput): Promise<Lean<TaskTag>> {
    const tagData = {
      name: input.name.trim(),
      color: input.color?.trim(),
      updatedAt: new Date()
    }

    try {
      const tag = await this.taskTagModel.create(tagData)
      return tag.toObject() as Lean<TaskTag>
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new BadRequestException("Tag đã tồn tại")
      }
      throw error
    }
  }

  async updateTag(id: string, input: UpdateTagInput): Promise<Lean<TaskTag>> {
    const updateData = {
      ...input,
      updatedAt: new Date()
    }

    try {
      const tag = await this.taskTagModel.findOneAndUpdate(
        { _id: id, deletedAt: null },
        updateData,
        { new: true, lean: true }
      )

      if (!tag) {
        throw new NotFoundException("Không tìm thấy tag")
      }

      return tag as unknown as Lean<TaskTag>
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new BadRequestException("Tên tag đã tồn tại")
      }
      throw error
    }
  }

  async deleteTag(id: string): Promise<{ message: string }> {
    const tag = await this.taskTagModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!tag) {
      throw new NotFoundException("Không tìm thấy tag")
    }

    return { message: "Xóa tag thành công" }
  }

  async getTagById(tagId: string): Promise<Lean<TaskTag> | null> {
    if (!Types.ObjectId.isValid(tagId)) return null
    return this.taskTagModel
      .findOne({ _id: tagId, deletedAt: null })
      .lean<Lean<TaskTag>>()
      .exec()
  }

  async searchTags(
    input: SearchTagsInput
  ): Promise<{ data: Lean<TaskTag>[]; totalPages: number }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    const match: Record<string, unknown> = {}

    // Filter deleted status
    if (input.deleted === true) {
      match.deletedAt = { $ne: null }
    } else if (input.deleted === false) {
      match.deletedAt = null
    }
    // If deleted is undefined, search all (both deleted and not deleted)

    // Search text filter
    if (input.searchText && input.searchText.trim()) {
      const text = input.searchText.trim()
      match.name = { $regex: text, $options: "i" }
    }

    const pipeline = [
      { $match: match },
      { $sort: { name: 1 as const } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    ]

    const agg = await this.taskTagModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return { data: first.data as Lean<TaskTag>[], totalPages }
  }

  async getAllTags(): Promise<{ data: Lean<TaskTag>[]; totalPages: number }> {
    const tags = await this.taskTagModel
      .find({ deletedAt: null })
      .sort({ name: 1 })
      .lean<Lean<TaskTag>[]>()
      .exec()

    return {
      data: tags,
      totalPages: tags.length > 0 ? 1 : 0
    }
  }

  async getAllTagsIncludeDeleted(): Promise<{
    data: Lean<TaskTag>[]
    totalPages: number
  }> {
    const tags = await this.taskTagModel
      .find({})
      .sort({ name: 1 })
      .lean<Lean<TaskTag>[]>()
      .exec()

    return {
      data: tags,
      totalPages: tags.length > 0 ? 1 : 0
    }
  }

  async restoreTag(id: string): Promise<{ message: string }> {
    const tag = await this.taskTagModel.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      {
        deletedAt: null,
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!tag) {
      throw new NotFoundException("Không tìm thấy tag đã xóa")
    }

    return { message: "Khôi phục tag thành công" }
  }
}
