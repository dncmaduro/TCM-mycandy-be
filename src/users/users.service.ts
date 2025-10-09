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
    @InjectModel("OAuth") readonly oauthModel: Model<OAuth>
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
        if (!userDoc) throw new Error("Upsert user failed")

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

      if (!user) throw new Error("User not found after upsert")

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
    const update: UpdateQuery<User> = {
      $set: {
        status: "active",
        approvedAt: new Date(),
        ...(Types.ObjectId.isValid(actedBy)
          ? { approvedBy: new Types.ObjectId(actedBy) }
          : {})
      }
    }

    return this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .lean<Lean<User>>()
      .exec()
  }

  async findByIdLean(id: string): Promise<Lean<User> | null> {
    if (!Types.ObjectId.isValid(id)) return null
    return this.userModel.findById(id).lean<Lean<User>>().exec()
  }
}
