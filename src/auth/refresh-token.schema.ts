import { Schema, model, Document, Types } from "mongoose"

export interface RefreshSession extends Document {
  userId: Types.ObjectId
  tokenId: string // jti của refresh JWT hoặc random id
  hashedToken: string // hash của refresh token (nếu lưu dạng random); nếu dùng JWT có thể hash full chuỗi
  userAgent?: string | null
  ip?: string | null
  createdAt: Date
  expiresAt: Date
  revokedAt?: Date | null
  rotatedTo?: string | null // tokenId mới khi rotate
}

export const RefreshSessionSchema = new Schema<RefreshSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  tokenId: { type: String, required: true, unique: true },
  hashedToken: { type: String, required: true },
  userAgent: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  rotatedTo: { type: String, default: null }
})

RefreshSessionSchema.index({ userId: 1, tokenId: 1 })
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL auto clean khi quá hạn

export const RefreshSessionModel = model<RefreshSession>(
  "RefreshSession",
  RefreshSessionSchema
)
