import { Document, model, Schema, Types } from "mongoose"

export interface Account extends Document {
  email: string
  passwordHash: string
  profileId?: Types.ObjectId | null // link đến Profile
  isVerified: boolean // verify email
  verificationToken?: string | null
  resetPasswordToken?: string | null
  resetPasswordExpires?: Date | null
  lastLoginAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export const AccountSchema = new Schema<Account>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String,
      default: null
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    minimize: true
  }
)

// Indexes
AccountSchema.index({ email: 1 }, { unique: true })
AccountSchema.index({ verificationToken: 1 }, { sparse: true })
AccountSchema.index({ resetPasswordToken: 1 }, { sparse: true })

// Pre-save normalization
AccountSchema.pre("save", function (next) {
  if (this.isModified("email") && this.email) {
    this.email = this.email.trim().toLowerCase()
  }
  next()
})

// Hide sensitive fields when serializing
AccountSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret.verificationToken
    delete ret.resetPasswordToken
    delete ret.__v
    return ret
  }
})

export const AccountModel = model<Account>("Account", AccountSchema)
