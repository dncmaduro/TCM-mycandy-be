import { Document, model, Schema, Types } from "mongoose"

export type UserStatus = "pending" | "active" | "rejected" | "suspended"

export interface User extends Document {
  email: string
  name?: string
  avatarUrl?: string
  googleSub: string // Google subject (unique)
  status: UserStatus // phê duyệt tài khoản
  approvedBy?: Types.ObjectId | null
  approvedAt?: Date | null
  rejectedReason?: string | null
  consentCalendar: boolean // đã cấp scope Calendar chưa
  createdAt: Date
  updatedAt: Date
}

export const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // chuẩn hoá để unique không phân biệt hoa/thường
      unique: true
    },
    name: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    googleSub: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
      index: true
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: null },
    consentCalendar: { type: Boolean, default: false }
  },
  {
    timestamps: true, // createdAt, updatedAt
    minimize: true
  }
)

// Indexes bổ sung
UserSchema.index({ googleSub: 1 }, { unique: true })
UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ status: 1 })

// Guard: chỉ cho active dùng app (tuỳ luồng, có thể dùng ở guard thay vì schema)
// UserSchema.methods.isActive = function () { return this.status === "active"; };

// Chuẩn hoá một số field trước khi lưu
UserSchema.pre("save", function (next) {
  if (this.isModified("email") && this.email)
    this.email = this.email.trim().toLowerCase()
  if (this.isModified("name") && this.name) this.name = this.name.trim()
  next()
})

// Ẩn field nội bộ khi serialize (nếu muốn gọn)
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  }
})

export const UserModel = model<User>("User", UserSchema)
