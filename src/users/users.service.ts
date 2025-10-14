import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import {
  Model,
  ClientSession,
  Types,
  FilterQuery,
  UpdateQuery,
  Document
} from "mongoose"
import { User } from "../database/schemas/User"
import { OAuth } from "../database/schemas/OAuth"
import { RoleUser, Role } from "../database/schemas/RoleUser"

// A minimal Lean type for Mongoose v8 (since LeanDocument is not exported)
type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type UpsertGoogleUserInput = {
  googleSub: string
  email: string
  name?: string
  avatarUrl?: string
  consentCalendar?: boolean // nếu không truyền sẽ derive từ scope
  tokens: {
    accessToken: string
    refreshToken?: string // Google có thể không trả
    expiresAt: Date
    scope: string
    idToken?: string
  }
}

type UpsertResult = {
  user: Lean<User>
  firstLogin: boolean
}

const CAL_SCOPE = "https://www.googleapis.com/auth/calendar"

@Injectable()
export class UsersService {
  constructor(
    @InjectModel("User") readonly userModel: Model<User>,
    @InjectModel("OAuth") readonly oauthModel: Model<OAuth>,
    @InjectModel("RoleUser") readonly roleUserModel: Model<RoleUser>
  ) {}

  /**
   * Upsert user & OAuth trong 1 transaction.
   * Trả về: { user, firstLogin }
   */
  async upsertGoogleUser(input: UpsertGoogleUserInput): Promise<UpsertResult> {
    const session: ClientSession = await this.userModel.db.startSession()

    const consentFromScope = input.tokens.scope?.includes(CAL_SCOPE)
    const consent =
      typeof input.consentCalendar === "boolean"
        ? input.consentCalendar
        : !!consentFromScope

    try {
      let firstLogin = false
      let userId: Types.ObjectId

      await session.withTransaction(async () => {
        const now = new Date()
        const email = input.email.trim().toLowerCase()

        // -------- 1) Upsert User --------
        const userFilter: FilterQuery<User> = { googleSub: input.googleSub }
        const userUpdate: UpdateQuery<User> = {
          $set: {
            email,
            name: input.name?.trim(),
            avatarUrl: input.avatarUrl,
            consentCalendar: consent,
            updatedAt: now
          },
          $setOnInsert: {
            googleSub: input.googleSub,
            status: "pending", // đổi 'active' nếu không cần duyệt
            createdAt: now
          }
        }

        // Use includeResultMetadata in Mongoose v8 to know if it was upserted
        const userRes = await this.userModel.findOneAndUpdate(
          userFilter,
          userUpdate,
          {
            new: true,
            upsert: true,
            session,
            includeResultMetadata: true
          }
        )

        // userRes is a ModifyResult-like object when includeResultMetadata is true
        const userDoc = (userRes as unknown as { value: User | null }).value
        if (!userDoc) throw new Error("Upsert user thất bại")

        userId = userDoc._id as unknown as Types.ObjectId
        const upserted = (
          userRes as unknown as {
            lastErrorObject?: { upserted?: Types.ObjectId }
          }
        ).lastErrorObject?.upserted
        firstLogin = Boolean(upserted)

        // -------- 2) Upsert OAuth --------
        const oauthFilter: FilterQuery<OAuth> = {
          userId,
          provider: "google"
        }

        const oauthSet: Partial<OAuth> = {
          provider: "google",
          providerAccountId: input.googleSub,
          accessToken: input.tokens.accessToken,
          expiresAt: input.tokens.expiresAt,
          scope: input.tokens.scope,
          tokenUpdatedAt: now
        }
        if (input.tokens.refreshToken) {
          oauthSet.refreshToken = input.tokens.refreshToken
        }
        if (input.tokens.idToken) {
          oauthSet.idToken = input.tokens.idToken
        }

        const oauthUpdate: UpdateQuery<OAuth> = {
          $set: oauthSet,
          $setOnInsert: { userId }
        }

        await this.oauthModel.updateOne(oauthFilter, oauthUpdate, {
          upsert: true,
          session
        })
      })

      // fetch lại lean document để trả về gọn nhẹ
      const user = await this.userModel
        .findOne({ googleSub: input.googleSub })
        .lean<Lean<User>>()
        .exec()

      if (!user) throw new Error("Không tìm thấy user sau khi upsert")

      return { user, firstLogin }
    } finally {
      await session.endSession()
    }
  }

  /** Approve user (nếu có workflow duyệt) */
  async approveUser(
    userId: string,
    actedBy: string
  ): Promise<Lean<User> | null> {
    if (!Types.ObjectId.isValid(userId)) return null

    const update: UpdateQuery<User> = {
      $set: {
        status: "active",
        approvedAt: new Date(),
        ...(Types.ObjectId.isValid(actedBy)
          ? { approvedBy: new Types.ObjectId(actedBy) }
          : {}),
        rejectedReason: null
      }
    }

    return this.userModel
      .findOneAndUpdate(
        {
          _id: userId,
          status: { $in: ["pending", "suspended"] }
        } as FilterQuery<User>,
        update,
        { new: true }
      )
      .lean<Lean<User>>()
      .exec()
  }

  /** Reject user: chỉ từ trạng thái pending */
  async rejectUser(
    userId: string,
    reason: string,
    actedBy: string
  ): Promise<Lean<User> | null> {
    if (!Types.ObjectId.isValid(userId)) return null

    const update: UpdateQuery<User> = {
      $set: {
        status: "rejected",
        rejectedReason: reason?.trim() || "",
        approvedBy: null,
        approvedAt: null,
        updatedAt: new Date()
      }
    }

    return this.userModel
      .findOneAndUpdate(
        { _id: userId, status: "pending" } as FilterQuery<User>,
        update,
        { new: true }
      )
      .lean<Lean<User>>()
      .exec()
  }

  /** Suspend user: chỉ từ trạng thái active */
  async suspendUser(
    userId: string,
    actedBy: string
  ): Promise<Lean<User> | null> {
    if (!Types.ObjectId.isValid(userId)) return null

    const update: UpdateQuery<User> = {
      $set: {
        status: "suspended",
        updatedAt: new Date()
      }
    }

    return this.userModel
      .findOneAndUpdate(
        { _id: userId, status: "active" } as FilterQuery<User>,
        update,
        { new: true }
      )
      .lean<Lean<User>>()
      .exec()
  }

  async findByIdLean(id: string): Promise<Lean<User> | null> {
    if (!Types.ObjectId.isValid(id)) return null
    return this.userModel.findById(id).lean<Lean<User>>().exec()
  }

  async getByEmailLean(email: string): Promise<Lean<User> | null> {
    const e = email.trim().toLowerCase()
    return this.userModel.findOne({ email: e }).lean<Lean<User>>().exec()
  }

  async searchUsers(params: {
    searchText?: string
    role?: Role
    page?: number
    limit?: number
  }): Promise<{ data: Lean<User>[]; totalPages: number }> {
    const { searchText, role } = params
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))

    const match: any = {}
    if (searchText && searchText.trim()) {
      const txt = searchText.trim()
      match.$or = [
        { email: { $regex: txt, $options: "i" } },
        { name: { $regex: txt, $options: "i" } }
      ]
    }

    const pipeline: any[] = []
    if (Object.keys(match).length) pipeline.push({ $match: match })

    // Lookup roles from roleusers (userId stored as string)
    const lookupPipeline: any[] = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$userId", "$$uid"] },
              ...(role ? [{ $eq: ["$role", role] }] : [])
            ]
          }
        }
      },
      { $project: { _id: 0, role: 1 } }
    ]

    pipeline.push({
      $addFields: { _idStr: { $toString: "$_id" } }
    })
    pipeline.push({
      $lookup: {
        from: "roleusers",
        let: { uid: "$_idStr" },
        pipeline: lookupPipeline,
        as: "roles"
      }
    })

    if (role) {
      pipeline.push({ $match: { roles: { $ne: [] } } })
    }

    pipeline.push(
      {
        $sort: { createdAt: -1 }
      },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    )

    const agg = await this.userModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    // remove roles helper field from output
    const data = (first.data as any[]).map((d) => {
      // strip helper fields if any
      delete d._idStr
      delete d.roles
      return d as Lean<User>
    })

    return { data, totalPages }
  }

  async searchUsersPublic(params: {
    searchText?: string
    page?: number
    limit?: number
  }): Promise<{
    data: Array<{
      _id: Types.ObjectId
      name?: string
      email: string
      avatarUrl?: string
    }>
    totalPages: number
  }> {
    const { searchText } = params
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))

    const match: any = {}
    if (searchText && searchText.trim()) {
      const txt = searchText.trim()
      match.$or = [
        { email: { $regex: txt, $options: "i" } },
        { name: { $regex: txt, $options: "i" } }
      ]
    }

    const pipeline: any[] = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          avatarUrl: 1
        }
      },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    ]

    const agg = await this.userModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return { data: first.data, totalPages }
  }
}
