import { Document, model, Schema, Types } from "mongoose"

export type Role = "user" | "subadmin" | "admin" | "superadmin"

export interface RoleUser extends Document {
  profileId: Types.ObjectId
  roles: Role[]
}

export const RoleUserSchema = new Schema<RoleUser>({
  profileId: {
    type: Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
    index: true,
    unique: true
  },
  roles: {
    type: [String],
    required: true,
    enum: ["user", "admin", "superadmin"],
    default: ["user"],
    index: true
  }
})

// One document per profile, but can have multiple roles

export const RoleUserModel = model<RoleUser>("RoleUser", RoleUserSchema)
