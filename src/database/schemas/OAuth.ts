import { Document, model, Schema, Types } from "mongoose"

export interface OAuth extends Document {
  userId: Types.ObjectId
  provider: "google"
  providerAccountId: string // chính là google sub
  accessToken: string
  refreshToken?: string // có thể không trả về
  expiresAt: Date
  scope: string // "openid email profile https://..."
  tokenUpdatedAt: Date
  idToken?: string // optional: lưu tạm lần gần nhất
}

export const OAuthSchema = new Schema<OAuth>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      enum: ["google"], // hiện tại chỉ hỗ trợ google
      default: "google"
    },
    providerAccountId: {
      // googleSub
      type: String,
      required: true,
      trim: true
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String }, // không required
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
    tokenUpdatedAt: { type: Date, default: Date.now },
    idToken: { type: String } // optional
  },
  {
    timestamps: true, // createdAt, updatedAt
    minimize: true
  }
)

// Unique constraints
OAuthSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true })
OAuthSchema.index({ userId: 1, provider: 1 }, { unique: true })

// Auto update tokenUpdatedAt if tokens change
OAuthSchema.pre("save", function (next) {
  if (this.isModified("accessToken") || this.isModified("refreshToken")) {
    this.tokenUpdatedAt = new Date()
  }
  next()
})

// Hide tokens when returning JSON
OAuthSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.accessToken
    delete ret.refreshToken
    delete ret.idToken
    return ret
  }
})

export const OAuthModel = model<OAuth>("OAuth", OAuthSchema)
