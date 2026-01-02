import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document, FilterQuery, UpdateQuery } from "mongoose"
import { Profile } from "../database/schemas/Profile"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel("Profile") private readonly profileModel: Model<Profile>
  ) {}

  async createProfile(
    accountId: string,
    data?: { name?: string; avatarUrl?: string }
  ): Promise<{ profile: Lean<Profile> }> {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new BadRequestException("Account ID không hợp lệ")
    }

    const profile = await this.profileModel.create({
      accountId: new Types.ObjectId(accountId),
      name: data?.name?.trim(),
      avatarUrl: data?.avatarUrl,
      status: "pending",
      consentCalendar: false
    })

    return { profile: profile.toObject() as Lean<Profile> }
  }

  async getProfileById(
    profileId: string
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(profileId)) return null
    const profile = await this.profileModel
      .findById(profileId)
      .lean<Lean<Profile>>()
      .exec()
    return { profile }
  }

  async getProfileByAccountId(
    accountId: string
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(accountId)) return null
    const profile = await this.profileModel
      .findOne({ accountId: new Types.ObjectId(accountId) })
      .lean<Lean<Profile>>()
      .exec()

    return { profile }
  }

  async updateProfile(
    profileId: string,
    data: { name?: string; avatarUrl?: string; consentCalendar?: boolean }
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(profileId)) return null

    const update: UpdateQuery<Profile> = {
      $set: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.consentCalendar !== undefined && {
          consentCalendar: data.consentCalendar
        }),
        updatedAt: new Date()
      }
    }

    const profile = await this.profileModel
      .findByIdAndUpdate(profileId, update, { new: true })
      .lean<Lean<Profile>>()
      .exec()

    return { profile }
  }

  async approveProfile(
    profileId: string,
    approvedBy: string
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(profileId)) return null

    const update: UpdateQuery<Profile> = {
      $set: {
        status: "active",
        approvedAt: new Date(),
        ...(Types.ObjectId.isValid(approvedBy) && {
          approvedBy: new Types.ObjectId(approvedBy)
        }),
        rejectedReason: null
      }
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          _id: profileId,
          status: { $in: ["pending", "suspended"] }
        } as FilterQuery<Profile>,
        update,
        { new: true }
      )
      .lean<Lean<Profile>>()
      .exec()

    return { profile }
  }

  async rejectProfile(
    profileId: string,
    reason: string,
    rejectedBy: string
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(profileId)) return null

    const update: UpdateQuery<Profile> = {
      $set: {
        status: "rejected",
        rejectedReason: reason?.trim() || "",
        approvedBy: null,
        approvedAt: null
      }
    }

    const profile = await this.profileModel
      .findOneAndUpdate(
        { _id: profileId, status: "pending" } as FilterQuery<Profile>,
        update,
        { new: true }
      )
      .lean<Lean<Profile>>()
      .exec()

    return { profile }
  }

  async suspendProfile(
    profileId: string
  ): Promise<{ profile: Lean<Profile> | null }> {
    if (!Types.ObjectId.isValid(profileId)) return null

    const profile = await this.profileModel
      .findByIdAndUpdate(
        profileId,
        { $set: { status: "suspended" } },
        { new: true }
      )
      .lean<Lean<Profile>>()
      .exec()

    return { profile }
  }

  async getAllProfiles(filter?: {
    page: number | string
    limit: number | string
    status?: string
  }): Promise<{ data: Lean<Profile>[]; total: number }> {
    const query: FilterQuery<Profile> = {}

    if (filter?.status) {
      query.status = filter.status
    }

    const page = Math.max(1, Number(filter?.page ?? 1))
    const limit = Math.max(1, Number(filter?.limit ?? 20))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.profileModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Lean<Profile>[]>()
        .exec(),
      this.profileModel.countDocuments(query).exec()
    ])

    return { data, total }
  }

  async publicSearchProfiles(filter?: {
    page?: number | string
    limit?: number | string
    searchText?: string
  }): Promise<{
    data: Array<{ _id: Types.ObjectId; name?: string; avatarUrl?: string }>
    total: number
  }> {
    const query: FilterQuery<Profile> = {
      status: "active" // Chỉ search profiles đã được approve
    }

    // Nếu có searchText, tìm theo name
    if (filter?.searchText?.trim()) {
      query.name = { $regex: filter.searchText.trim(), $options: "i" }
    }

    const page = Math.max(1, Number(filter?.page ?? 1))
    const limit = Math.max(1, Number(filter?.limit ?? 20))
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.profileModel
        .find(query)
        .select("_id name avatarUrl") // Chỉ lấy 3 fields
        .sort({ name: 1 }) // Sort theo tên A-Z
        .skip(skip)
        .limit(limit)
        .lean<
          Array<{ _id: Types.ObjectId; name?: string; avatarUrl?: string }>
        >()
        .exec(),
      this.profileModel.countDocuments(query).exec()
    ])

    return { data, total }
  }

  async adminSearchProfiles(filter?: {
    page?: number | string
    limit?: number | string
    searchText?: string
    role?: string
    status?: string
  }): Promise<{
    data: Array<{
      _id: Types.ObjectId
      name?: string
      avatarUrl?: string
      status: string
      email?: string
      roles?: string[]
      createdAt: Date
      updatedAt: Date
    }>
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = Math.max(1, Number(filter?.page ?? 1))
    const limit = Math.max(1, Number(filter?.limit ?? 20))
    const skip = (page - 1) * limit

    const pipeline: any[] = []

    // Lookup Account để lấy email
    pipeline.push({
      $lookup: {
        from: "accounts",
        localField: "accountId",
        foreignField: "_id",
        as: "account"
      }
    })
    pipeline.push({
      $unwind: { path: "$account", preserveNullAndEmptyArrays: true }
    })

    // Lookup RoleUser để lấy roles
    pipeline.push({
      $lookup: {
        from: "roleusers",
        localField: "_id",
        foreignField: "profileId",
        as: "roleUser"
      }
    })
    pipeline.push({
      $unwind: { path: "$roleUser", preserveNullAndEmptyArrays: true }
    })

    // Match conditions
    const matchConditions: any = {}

    // Filter by status
    if (filter?.status) {
      matchConditions.status = filter.status
    }

    // Filter by role
    if (filter?.role) {
      matchConditions["roleUser.roles"] = filter.role
    }

    // Filter by searchText (name or email)
    if (filter?.searchText?.trim()) {
      const searchRegex = { $regex: filter.searchText.trim(), $options: "i" }
      matchConditions.$or = [
        { name: searchRegex },
        { "account.email": searchRegex }
      ]
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions })
    }

    // Sort
    pipeline.push({ $sort: { createdAt: -1 } })

    // Facet for pagination
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              avatarUrl: 1,
              status: 1,
              email: "$account.email",
              roles: "$roleUser.roles",
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        count: [{ $count: "total" }]
      }
    })

    const result = await this.profileModel.aggregate(pipeline).exec()
    const first = result[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return {
      data: first.data,
      total,
      page,
      limit,
      totalPages
    }
  }
}
