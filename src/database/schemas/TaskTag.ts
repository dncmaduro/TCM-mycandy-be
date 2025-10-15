import { Document, model, Schema } from "mongoose"

export interface TaskTag extends Document {
  name: string
  color?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export const TaskTagSchema = new Schema<TaskTag>({
  name: { type: String, required: true, trim: true, unique: true },
  color: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
})

export const TaskTagModel = model<TaskTag>("TaskTag", TaskTagSchema)
