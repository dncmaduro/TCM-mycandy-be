import { Document, Schema, model, Types } from "mongoose"

export type TimeRequestStatus = "pending" | "approved" | "rejected"

export type ReviewerStatus = "pending" | "approved" | "rejected"

export interface Reviewer {
  profileId: Types.ObjectId
  status: ReviewerStatus
  reviewedAt?: Date
}

export type TimeRequestType =
  | "overtime"
  | "day_off"
  | "remote_work"
  | "leave_early"
  | "late_arrival"

export interface TimeRequest extends Document {
  createdBy: Types.ObjectId
  type: TimeRequestType
  reason: string
  minutes?: number
  date: Date | null
  status: TimeRequestStatus
  reviewers: Reviewer[] // Danh sách những người cần review
  reviewedBy?: Types.ObjectId | null // Deprecated - giữ lại cho backward compatibility
  reviewedAt?: Date | null // Deprecated - giữ lại cho backward compatibility
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export const TimeRequestSchema = new Schema<TimeRequest>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        "overtime",
        "day_off",
        "remote_work",
        "leave_early",
        "late_arrival"
      ],
      required: true,
      index: true
    },
    reason: { type: String, trim: true, required: true },
    minutes: { type: Number },
    date: { type: Date, default: null, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewers: [
      {
        profileId: {
          type: Schema.Types.ObjectId,
          ref: "Profile",
          required: true
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending"
        },
        reviewedAt: { type: Date }
      }
    ],
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true
    },
    reviewedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

export const TimeRequestModel = model<TimeRequest>(
  "TimeRequest",
  TimeRequestSchema
)
