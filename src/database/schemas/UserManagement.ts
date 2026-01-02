import { Schema, Types, model, Document } from "mongoose"

export interface UserManagement {
  manager: Types.ObjectId // Profile của manager
  employee: Types.ObjectId // Profile của nhân viên
  createdAt: Date
  updatedAt: Date
}

export interface UserManagementDocument extends UserManagement, Document {}

export const UserManagementSchema = new Schema<UserManagementDocument>(
  {
    manager: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    }
  },
  { timestamps: true }
)

// Đảm bảo mỗi cặp manager-employee là duy nhất (một employee có thể có nhiều manager)
UserManagementSchema.index({ manager: 1, employee: 1 }, { unique: true })

// Index để query nhanh
UserManagementSchema.index({ manager: 1 })
UserManagementSchema.index({ employee: 1 })

export const UserManagementModel = model<UserManagementDocument>(
  "UserManagement",
  UserManagementSchema
)
