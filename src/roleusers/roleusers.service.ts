import { Injectable, BadRequestException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { RoleUser, Role } from "../database/schemas/RoleUser"

@Injectable()
export class RoleUsersService {
  constructor(
    @InjectModel("RoleUser") private readonly roleUserModel: Model<RoleUser>
  ) {}

  async getRoles(profileId: string): Promise<Role[] | null> {
    if (!Types.ObjectId.isValid(profileId)) {
      return null
    }
    const res = await this.roleUserModel
      .findOne({ profileId: new Types.ObjectId(profileId) })
      .lean<{ roles: Role[] }>()
      .exec()
    return res ? res.roles : null
  }

  async setRole(profileId: string, role: Role): Promise<Role[]> {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }
    const valid: Role[] = ["user", "admin", "superadmin"]
    if (!valid.includes(role))
      throw new BadRequestException("Giá trị role không hợp lệ")

    // Add role if not already present
    const res = await this.roleUserModel
      .findOneAndUpdate(
        { profileId: new Types.ObjectId(profileId) },
        { $addToSet: { roles: role } },
        { new: true, upsert: true }
      )
      .lean<{ roles: Role[] }>()
      .exec()
    return res!.roles
  }

  async removeRole(
    profileId: string,
    role?: Role
  ): Promise<{ removed: boolean; roles?: Role[] }> {
    if (!Types.ObjectId.isValid(profileId)) {
      return { removed: false }
    }

    // If role is specified, remove that specific role
    if (role) {
      const res = await this.roleUserModel
        .findOneAndUpdate(
          { profileId: new Types.ObjectId(profileId) },
          { $pull: { roles: role } },
          { new: true }
        )
        .lean<{ roles: Role[] }>()
        .exec()

      return { removed: true, roles: res?.roles || [] }
    }

    // If no role specified, delete the entire document
    const r = await this.roleUserModel
      .deleteOne({ profileId: new Types.ObjectId(profileId) })
      .exec()
    return { removed: r.deletedCount === 1 }
  }

  async setRoles(profileId: string, roles: Role[]): Promise<Role[]> {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }
    const valid: Role[] = ["user", "admin", "superadmin"]
    const invalidRoles = roles.filter((r) => !valid.includes(r))
    if (invalidRoles.length > 0) {
      throw new BadRequestException(
        `Giá trị role không hợp lệ: ${invalidRoles.join(", ")}`
      )
    }

    // Set all roles at once (replaces existing roles)
    const res = await this.roleUserModel
      .findOneAndUpdate(
        { profileId: new Types.ObjectId(profileId) },
        { $set: { roles: [...new Set(roles)] } }, // Remove duplicates
        { new: true, upsert: true }
      )
      .lean<{ roles: Role[] }>()
      .exec()
    return res!.roles
  }
}
