import { Document, Schema, Types, model } from "mongoose"

export type NotificationType =
  | "task_assigned"
  | "task_updated"
  | "comment_mentioned"
  | "task_status_changed"
  | "task_due_soon"
  | "comment_added"
  | "time_request_approved"
  | "time_request_rejected"
  | "time_request_added"
  | "sprint_started"
  | "new_user"

export interface Notification extends Document {
  userId: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

export const NotificationSchema = new Schema<Notification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "task_assigned",
      "task_updated",
      "comment_mentioned",
      "task_status_changed",
      "task_due_soon",
      "comment_added",
      "time_request_approved",
      "time_request_rejected",
      "time_request_added",
      "sprint_started",
      "new_user"
    ],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
})

export const NotificationModel = model<Notification>(
  "Notification",
  NotificationSchema
)
