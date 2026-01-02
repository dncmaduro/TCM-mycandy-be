import { Document, Schema, Types, model } from "mongoose"

export interface TaskComment extends Document {
  taskId: Types.ObjectId
  userId: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
}

export const TaskCommentSchema = new Schema<TaskComment>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const TaskCommentModel = model<TaskComment>(
  "TaskComment",
  TaskCommentSchema
)
