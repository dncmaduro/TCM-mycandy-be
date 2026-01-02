import { Document, model, Schema, Types } from "mongoose"

export type ProfileStatus = "pending" | "active" | "rejected" | "suspended"

export interface Profile extends Document {
  accountId: Types.ObjectId // link đến Account
  name?: string
  avatarUrl?: string
  status: ProfileStatus
  approvedBy?: Types.ObjectId | null
  approvedAt?: Date | null
  rejectedReason?: string | null
  consentCalendar: boolean // cho Calendar API scope
  createdAt: Date
  updatedAt: Date
}

export const ProfileSchema = new Schema<Profile>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      trim: true
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
      index: true
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedReason: {
      type: String,
      default: null
    },
    consentCalendar: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    minimize: true
  }
)

// Indexes
ProfileSchema.index({ accountId: 1 }, { unique: true })
ProfileSchema.index({ status: 1 })

// Pre-save normalization
ProfileSchema.pre("save", function (next) {
  if (this.isModified("name") && this.name) {
    this.name = this.name.trim()
  }
  next()
})

// Serialize
ProfileSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v
    return ret
  }
})

export const ProfileModel = model<Profile>("Profile", ProfileSchema)
