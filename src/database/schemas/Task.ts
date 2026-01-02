import { Document, model, Schema, Types } from "mongoose"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Task extends Document {
  title: string
  description?: string
  sprint: Types.ObjectId
  aim: number
  aimUnit: string
  progress: number
  priority: TaskPriority
  createdBy: Types.ObjectId
  assignedTo?: Types.ObjectId | null
  dueDate?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  tags?: string[]
  estimateHours?: number
  evaluation?: string
}

export const TaskSchema = new Schema<Task>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      index: true
    },
    aim: { type: Number, required: true, default: 0 },
    aimUnit: { type: String, required: true, default: "hours" },
    progress: { type: Number, required: true, default: 0 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true
    },
    dueDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
    tags: { type: [String], default: [] },
    estimateHours: { type: Number, default: null },
    evaluation: { type: String, default: null, trim: true }
  },
  {
    timestamps: true, // createdAt, updatedAt
    minimize: true
  }
)

export const TaskModel = model<Task>("Task", TaskSchema)
