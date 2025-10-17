import { Document, model, Schema, Types } from "mongoose"

export type TaskStatus =
  | "new"
  | "in_progress"
  | "completed"
  | "archived"
  | "canceled"
  | "reviewing"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Task extends Document {
  title: string
  description?: string
  sprint: Types.ObjectId
  parentTaskId?: Types.ObjectId | null
  status: TaskStatus
  priority: TaskPriority
  createdBy: Types.ObjectId
  assignedTo?: Types.ObjectId | null
  dueDate?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  tags?: string[]
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
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    status: {
      type: String,
      enum: [
        "new",
        "in_progress",
        "completed",
        "archived",
        "canceled",
        "reviewing"
      ],
      default: "new",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    dueDate: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
    tags: { type: [String], default: [] }
  },
  {
    timestamps: true, // createdAt, updatedAt
    minimize: true
  }
)

export const TaskModel = model<Task>("Task", TaskSchema)
