import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import {
  TimeRequest,
  TimeRequestType,
  TimeRequestStatus
} from "../database/schemas/TimeRequest"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type CreateTimeRequestInput = {
  type: TimeRequestType
  reason: string
  minutes?: number
  date: Date
}

type UpdateTimeRequestInput = {
  type?: TimeRequestType
  reason?: string
  minutes?: number
  date?: Date
}

type GetOwnRequestsInput = {
  page?: number
  limit?: number
  deleted?: boolean
}

type GetAllRequestsInput = {
  page?: number
  limit?: number
  date?: Date
  status?: TimeRequestStatus
}

@Injectable()
export class TimeRequestsService {
  constructor(
    @InjectModel("TimeRequest")
    private readonly timeRequestModel: Model<TimeRequest>
  ) {}

  async createRequest(
    input: CreateTimeRequestInput,
    userId: string
  ): Promise<Lean<TimeRequest>> {
    // Validate: day_off không cần minutes, các type khác cần minutes
    if (input.type === "day_off") {
      if (input.minutes) {
        throw new BadRequestException(
          "Yêu cầu nghỉ phép không cần trường minutes"
        )
      }
    } else {
      if (!input.minutes || input.minutes <= 0) {
        throw new BadRequestException(
          "Yêu cầu này cần trường minutes và phải lớn hơn 0"
        )
      }
    }

    const requestData = {
      createdBy: userId,
      type: input.type,
      reason: input.reason.trim(),
      minutes: input.type === "day_off" ? undefined : input.minutes,
      date: input.date,
      status: "pending" as TimeRequestStatus
    }

    const request = await this.timeRequestModel.create(requestData)
    return request.toObject() as Lean<TimeRequest>
  }

  async updateRequest(
    requestId: string,
    input: UpdateTimeRequestInput,
    userId: string
  ): Promise<Lean<TimeRequest>> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    const request = await this.timeRequestModel
      .findOne({
        _id: requestId,
        deletedAt: null
      })
      .exec()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    if (request.createdBy !== userId) {
      throw new ForbiddenException("Không có quyền cập nhật yêu cầu này")
    }

    // Không cho phép update request đã được duyệt hoặc từ chối
    if (request.status !== "pending") {
      throw new BadRequestException("Không thể cập nhật yêu cầu đã được xử lý")
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (input.type) {
      updateData.type = input.type
      // Validate lại nếu đổi type
      if (input.type === "day_off") {
        updateData.minutes = undefined
      }
    }

    if (input.reason !== undefined) {
      updateData.reason = input.reason.trim()
    }

    if (input.minutes !== undefined) {
      const finalType = input.type || request.type
      if (finalType === "day_off") {
        throw new BadRequestException(
          "Yêu cầu nghỉ phép không cần trường minutes"
        )
      }
      if (input.minutes <= 0) {
        throw new BadRequestException("Minutes phải lớn hơn 0")
      }
      updateData.minutes = input.minutes
    }

    if (input.date) {
      updateData.date = input.date
    }

    const updated = await this.timeRequestModel
      .findByIdAndUpdate(requestId, updateData, { new: true, lean: true })
      .exec()

    return updated as unknown as Lean<TimeRequest>
  }

  async getOwnRequests(
    input: GetOwnRequestsInput,
    userId: string
  ): Promise<{ data: Lean<TimeRequest>[]; totalPages: number }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    const match: Record<string, unknown> = {
      createdBy: userId
    }

    // Filter deleted
    if (input.deleted === true) {
      match.deletedAt = { $ne: null }
    } else if (input.deleted === false || input.deleted === undefined) {
      match.deletedAt = null
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 as const } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    ]

    const agg = await this.timeRequestModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return { data: first.data as Lean<TimeRequest>[], totalPages }
  }

  async getAllRequests(
    input: GetAllRequestsInput
  ): Promise<{ data: Lean<TimeRequest>[]; totalPages: number }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    const match: Record<string, unknown> = {}

    // Filter by date
    if (input.date) {
      const startOfDay = new Date(input.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(input.date)
      endOfDay.setHours(23, 59, 59, 999)

      match.date = {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }

    // Filter by status
    if (input.status) {
      match.status = input.status
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 as const } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    ]

    const agg = await this.timeRequestModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return { data: first.data as Lean<TimeRequest>[], totalPages }
  }

  async reviewRequest(
    requestId: string,
    action: "approve" | "reject",
    adminId: string
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    const request = await this.timeRequestModel
      .findOne({
        _id: requestId
      })
      .exec()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    if (request.status !== "pending") {
      throw new BadRequestException("Yêu cầu này đã được xử lý")
    }

    const status: TimeRequestStatus =
      action === "approve" ? "approved" : "rejected"

    await this.timeRequestModel
      .findByIdAndUpdate(requestId, {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .exec()

    const actionText = action === "approve" ? "chấp nhận" : "từ chối"
    return { message: `Đã ${actionText} yêu cầu thành công` }
  }

  async deleteRequest(
    requestId: string,
    userId: string
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    const request = await this.timeRequestModel
      .findOne({
        _id: requestId,
        deletedAt: null
      })
      .exec()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    if (request.createdBy !== userId) {
      throw new ForbiddenException("Không có quyền xóa yêu cầu này")
    }

    await this.timeRequestModel
      .findByIdAndUpdate(requestId, {
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .exec()

    return { message: "Xóa yêu cầu thành công" }
  }

  async getRequestById(requestId: string): Promise<Lean<TimeRequest>> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    const request = await this.timeRequestModel
      .findOne({
        _id: requestId,
        deletedAt: null
      })
      .exec()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    return request.toObject() as Lean<TimeRequest>
  }

  async getOwnRequestsByMonth(
    month: number,
    year: number,
    userId: string
  ): Promise<{ requests: Lean<TimeRequest>[] }> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const requests = await this.timeRequestModel
      .find({
        createdBy: userId,
        deletedAt: null,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .exec()

    return { requests: requests.map((r) => r.toObject() as Lean<TimeRequest>) }
  }
}
