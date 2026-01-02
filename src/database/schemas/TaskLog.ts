import { Document, Schema, Types, model } from "mongoose"

export type TaskLogType =
  | "status_change"
  | "comment"
  | "update_information"
  | "assignment"
  | "sprint_change"

export interface TaskLog extends Document {
  taskId: Types.ObjectId
  type: TaskLogType
  userId: Types.ObjectId
  meta?: Record<string, any>
  createdAt: Date
}

export const TaskLogSchema = new Schema<TaskLog>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "status_change",
      "comment",
      "update_information",
      "assignment",
      "sprint_change"
    ],
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
    index: true
  },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
})

export const TaskLogModel = model<TaskLog>("TaskLog", TaskLogSchema)
