import { Injectable, BadRequestException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { RoleUser, Role } from "../database/schemas/RoleUser"

@Injectable()
export class RoleUsersService {
  constructor(
    @InjectModel("RoleUser") private readonly roleUserModel: Model<RoleUser>
  ) {}

  async getRole(userId: string): Promise<Role | null> {
    const doc = await this.roleUserModel
      .findOne({ userId })
      .lean<{ role: Role }>()
      .exec()
    return doc?.role ?? null
  }

  async setRole(userId: string, role: Role): Promise<Role> {
    const valid: Role[] = ["user", "admin", "superadmin"]
    if (!valid.includes(role))
      throw new BadRequestException("Giá trị role không hợp lệ")
    const res = await this.roleUserModel
      .findOneAndUpdate(
        { userId },
        { $set: { role } },
        { new: true, upsert: true }
      )
      .lean<{ role: Role }>()
      .exec()
    return res!.role
  }

  async removeRole(userId: string): Promise<{ removed: boolean }> {
    const r = await this.roleUserModel.deleteOne({ userId }).exec()
    return { removed: r.deletedCount === 1 }
  }
}
