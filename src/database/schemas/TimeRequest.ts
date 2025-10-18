import { Document, Schema, model } from "mongoose"

export type TimeRequestStatus = "pending" | "approved" | "rejected"

export type TimeRequestType =
  | "overtime"
  | "day_off"
  | "remote_work"
  | "leave_early"
  | "late_arrival"

export interface TimeRequest extends Document {
  createdBy: string
  type: TimeRequestType
  reason: string
  minutes?: number
  date: Date | null
  status: TimeRequestStatus
  reviewedBy?: string | null
  reviewedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export const TimeRequestSchema = new Schema<TimeRequest>(
  {
    createdBy: { type: String, required: true, index: true },
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
    }, // eslint-disable-line
    reviewedBy: { type: String, default: null, index: true },
    reviewedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

export const TimeRequestModel = model<TimeRequest>(
  "TimeRequest",
  TimeRequestSchema
)
