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
  TimeRequestStatus,
  Reviewer
} from "../database/schemas/TimeRequest"
import { Profile } from "../database/schemas/Profile"
import { RoleUser } from "../database/schemas/RoleUser"
import { NotificationsService } from "../notifications/notifications.service"
import { NotificationsGateway } from "../notifications/notifications.gateway"
import { UserManagementService } from "../user-management/user-management.service"

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
    private readonly timeRequestModel: Model<TimeRequest>,
    @InjectModel("Profile")
    private readonly profileModel: Model<Profile>,
    @InjectModel("RoleUser")
    private readonly roleUserModel: Model<RoleUser>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private userManagementService: UserManagementService
  ) {}

  async createRequest(
    input: CreateTimeRequestInput,
    profileId: string
  ): Promise<Lean<TimeRequest>> {
    // Validate profileId
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    // Check profile exists
    const profile = await this.profileModel
      .findById(profileId)
      .select("_id name avatarUrl")
      .lean()

    if (!profile) {
      throw new NotFoundException("Không tìm thấy profile")
    }

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

    // Lấy danh sách managers từ UserManagement
    const managersResult =
      await this.userManagementService.getManagersOfEmployee(
        profileId,
        { page: 1, limit: 100 } // Lấy tất cả managers
      )

    // Tạo danh sách reviewers từ managers
    const reviewers: Reviewer[] = managersResult.data.map((manager) => ({
      profileId: manager._id,
      status: "pending" as const,
      reviewedAt: undefined
    }))

    // Nếu không có manager, throw error hoặc tự động approved (tuỳ logic nghiệp vụ)
    if (reviewers.length === 0) {
      throw new BadRequestException(
        "Bạn chưa có manager. Vui lòng liên hệ admin để được gán manager trước khi tạo yêu cầu."
      )
    }

    const requestData = {
      createdBy: new Types.ObjectId(profileId),
      type: input.type,
      reason: input.reason.trim(),
      minutes: input.type === "day_off" ? undefined : input.minutes,
      date: input.date,
      status: "pending" as TimeRequestStatus,
      reviewers: reviewers
    }

    const request = await this.timeRequestModel.create(requestData)

    // Gửi notification cho các managers
    try {
      const typeText = this.getTypeText(input.type)
      for (const reviewer of reviewers) {
        console.log(reviewer, reviewer.profileId.toString())
        const managerProfileId = reviewer.profileId.toString()
        console.log("Sending notification to", managerProfileId)
        const notification = await this.notificationsService.createNotification(
          {
            userId: managerProfileId,
            type: "time_request_added",
            title: "Yêu cầu mới cần duyệt",
            message: `${profile.name || "User"} đã tạo yêu cầu ${typeText} cần bạn duyệt`
          }
        )
        this.notificationsGateway.sendNotificationToUser(
          managerProfileId,
          notification
        )
      }
    } catch (error) {
      console.error("Error sending time_request_added notification:", error)
    }

    // Populate and return
    const populated = await this.timeRequestModel
      .findById(request._id)
      .populate("createdBy", "name avatarUrl")
      .populate("reviewers.profileId", "name avatarUrl")
      .lean<Lean<TimeRequest>>()

    return populated!
  }

  private getTypeText(type: TimeRequestType): string {
    const typeMap = {
      overtime: "làm thêm giờ",
      day_off: "nghỉ phép",
      remote_work: "làm việc từ xa",
      leave_early: "về sớm",
      late_arrival: "đi muộn"
    }
    return typeMap[type] || type
  }

  async updateRequest(
    requestId: string,
    input: UpdateTimeRequestInput,
    profileId: string
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

    if (request.createdBy.toString() !== profileId) {
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
      .findByIdAndUpdate(requestId, updateData, { new: true })
      .populate("createdBy", "name avatarUrl")
      .populate("reviewedBy", "name avatarUrl")
      .populate("reviewers.profileId", "name avatarUrl")
      .lean<Lean<TimeRequest>>()

    return updated!
  }

  async getOwnRequests(
    input: GetOwnRequestsInput,
    profileId: string
  ): Promise<{
    data: Lean<TimeRequest>[]
    total: number
    page: number
    limit: number
  }> {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    const match: Record<string, unknown> = {
      createdBy: new Types.ObjectId(profileId)
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
        $lookup: {
          from: "profiles",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$reviewedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewers.profileId",
          foreignField: "_id",
          as: "reviewersProfiles"
        }
      },
      {
        $addFields: {
          reviewers: {
            $map: {
              input: "$reviewers",
              as: "reviewer",
              in: {
                profileId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$reviewersProfiles",
                        as: "profile",
                        cond: { $eq: ["$$profile._id", "$$reviewer.profileId"] }
                      }
                    },
                    0
                  ]
                },
                status: "$$reviewer.status",
                reviewedAt: "$$reviewer.reviewedAt"
              }
            }
          }
        }
      },
      { $project: { reviewersProfiles: 0 } },
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

    return { data: first.data as Lean<TimeRequest>[], total, page, limit }
  }

  async getAllRequests(
    input: GetAllRequestsInput
  ): Promise<{ data: Lean<TimeRequest>[]; total: number }> {
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
        $lookup: {
          from: "profiles",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$reviewedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewers.profileId",
          foreignField: "_id",
          as: "reviewersProfiles"
        }
      },
      {
        $addFields: {
          reviewers: {
            $map: {
              input: "$reviewers",
              as: "reviewer",
              in: {
                profileId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$reviewersProfiles",
                        as: "profile",
                        cond: { $eq: ["$$profile._id", "$$reviewer.profileId"] }
                      }
                    },
                    0
                  ]
                },
                status: "$$reviewer.status",
                reviewedAt: "$$reviewer.reviewedAt"
              }
            }
          }
        }
      },
      { $project: { reviewersProfiles: 0 } },
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

    return { data: first.data as Lean<TimeRequest>[], total }
  }

  async reviewRequest(
    requestId: string,
    action: "approve" | "reject",
    reviewerProfileId: string
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    if (!Types.ObjectId.isValid(reviewerProfileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    const request = await this.timeRequestModel
      .findOne({
        _id: requestId
      })
      .exec()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    // Kiểm tra xem người review có trong danh sách reviewers không
    const reviewerIndex = request.reviewers.findIndex(
      (r) => r.profileId.toString() === reviewerProfileId
    )

    if (reviewerIndex === -1) {
      throw new ForbiddenException("Bạn không có quyền duyệt yêu cầu này")
    }

    // Kiểm tra xem reviewer này đã review chưa
    if (request.reviewers[reviewerIndex].status !== "pending") {
      throw new BadRequestException("Bạn đã duyệt yêu cầu này rồi")
    }

    // Cập nhật status của reviewer
    const reviewerStatus = action === "approve" ? "approved" : "rejected"
    request.reviewers[reviewerIndex].status = reviewerStatus
    request.reviewers[reviewerIndex].reviewedAt = new Date()

    // Tính toán status tổng
    let overallStatus: TimeRequestStatus = "pending"

    // Nếu có ít nhất 1 người reject -> status tổng = rejected
    const hasRejected = request.reviewers.some((r) => r.status === "rejected")
    if (hasRejected) {
      overallStatus = "rejected"
    } else {
      // Nếu tất cả đều approved -> status tổng = approved
      const allApproved = request.reviewers.every(
        (r) => r.status === "approved"
      )
      if (allApproved) {
        overallStatus = "approved"
      }
      // Còn nếu còn ít nhất 1 người pending -> status tổng = pending
    }

    // Cập nhật request
    request.status = overallStatus
    request.reviewedBy = new Types.ObjectId(reviewerProfileId) // Backward compatibility
    request.reviewedAt = new Date() // Backward compatibility
    request.updatedAt = new Date()

    await request.save()

    // Gửi notification cho user nếu status tổng thay đổi
    if (overallStatus !== "pending") {
      try {
        const typeText = this.getTypeText(request.type)
        const notificationType =
          overallStatus === "approved"
            ? "time_request_approved"
            : "time_request_rejected"
        const actionText =
          overallStatus === "approved" ? "chấp nhận" : "từ chối"

        const notification = await this.notificationsService.createNotification(
          {
            userId: request.createdBy.toString(),
            type: notificationType,
            title: `Yêu cầu ${actionText}`,
            message: `Yêu cầu ${typeText} của bạn đã được ${actionText}`
          }
        )
        this.notificationsGateway.sendNotificationToUser(
          request.createdBy.toString(),
          notification
        )
      } catch (error) {
        console.error("Error sending review notification:", error)
      }
    }

    const actionText = action === "approve" ? "chấp nhận" : "từ chối"
    return { message: `Đã ${actionText} yêu cầu thành công` }
  }

  async deleteRequest(
    requestId: string,
    profileId: string
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

    if (request.createdBy.toString() !== profileId) {
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
      .populate("createdBy", "name avatarUrl")
      .populate("reviewedBy", "name avatarUrl")
      .lean<Lean<TimeRequest>>()

    if (!request) {
      throw new NotFoundException("Không tìm thấy yêu cầu")
    }

    return request
  }

  async getOwnRequestsByMonth(
    month: number,
    year: number,
    profileId: string
  ): Promise<{ requests: Lean<TimeRequest>[] }> {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const requests = await this.timeRequestModel
      .find({
        createdBy: new Types.ObjectId(profileId),
        deletedAt: null,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .populate("createdBy", "name avatarUrl")
      .populate("reviewedBy", "name avatarUrl")
      .lean<Lean<TimeRequest>[]>()

    return { requests }
  }

  async getPendingRequestsForReviewer(
    reviewerProfileId: string,
    input: { page?: number; limit?: number; status?: string }
  ): Promise<{
    data: Lean<TimeRequest>[]
    total: number
    page: number
    limit: number
  }> {
    if (!Types.ObjectId.isValid(reviewerProfileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    // Build match condition
    const matchCondition: any = {
      "reviewers.profileId": new Types.ObjectId(reviewerProfileId)
    }

    const pipeline = [
      {
        $match: matchCondition
      },
      // Add field để lưu status của reviewer hiện tại
      {
        $addFields: {
          currentReviewerStatus: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$reviewers",
                      as: "r",
                      cond: {
                        $eq: [
                          "$$r.profileId",
                          new Types.ObjectId(reviewerProfileId)
                        ]
                      }
                    }
                  },
                  as: "filtered",
                  in: "$$filtered.status"
                }
              },
              0
            ]
          },
          hasAnyRejected: {
            $in: ["rejected", "$reviewers.status"]
          }
        }
      },
      // Filter theo logic:
      // - rejected: Chỉ lấy requests có BẤT KỲ ai reject (hasAnyRejected = true)
      // - pending: Lấy requests mà currentReviewerStatus = pending VÀ không có ai reject
      // - approved: Lấy requests mà currentReviewerStatus = approved VÀ không có ai reject
      // - Không có filter (all): Lấy tất cả
      ...(input.status === "rejected"
        ? [{ $match: { hasAnyRejected: true } }]
        : input.status === "pending"
          ? [
              {
                $match: {
                  currentReviewerStatus: "pending",
                  hasAnyRejected: false
                }
              }
            ]
          : input.status === "approved"
            ? [
                {
                  $match: {
                    currentReviewerStatus: "approved",
                    hasAnyRejected: false
                  }
                }
              ]
            : []),
      { $sort: { createdAt: -1 as const } },
      {
        $lookup: {
          from: "profiles",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewedBy",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$reviewedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "reviewers.profileId",
          foreignField: "_id",
          as: "reviewersProfiles"
        }
      },
      {
        $addFields: {
          reviewers: {
            $map: {
              input: "$reviewers",
              as: "reviewer",
              in: {
                profileId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$reviewersProfiles",
                        as: "profile",
                        cond: { $eq: ["$$profile._id", "$$reviewer.profileId"] }
                      }
                    },
                    0
                  ]
                },
                status: "$$reviewer.status",
                reviewedAt: "$$reviewer.reviewedAt"
              }
            }
          }
        }
      },
      {
        $project: {
          reviewersProfiles: 0,
          currentReviewerStatus: 0,
          hasAnyRejected: 0
        }
      },
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

    return { data: first.data as Lean<TimeRequest>[], total, page, limit }
  }
}
