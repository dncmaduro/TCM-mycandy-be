import { Document, Schema } from "mongoose"

export type Role = "user" | "admin" | "superadmin"

export interface RoleUser extends Document {
  userId: string
  role: Role
}

export const RoleUserSchema = new Schema<RoleUser>({
  userId: { type: String, required: true, index: true, unique: true },
  role: {
    type: String,
    required: true,
    enum: ["user", "admin", "superadmin"],
    default: "user",
    index: true
  }
})

// One role per user enforced by unique userId
// Remove composite unique index

export const RoleUserModel = {
  name: "RoleUser",
  schema: RoleUserSchema
}
