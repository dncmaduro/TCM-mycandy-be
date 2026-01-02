import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { UserManagement } from "../database/schemas/UserManagement"
import { Profile } from "../database/schemas/Profile"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type AssignManagerInput = {
  managerId: string
  employeeId: string
}

type GetManagementInput = {
  page?: number
  limit?: number
}

@Injectable()
export class UserManagementService {
  constructor(
    @InjectModel("UserManagement")
    private readonly userManagementModel: Model<UserManagement>,
    @InjectModel("Profile")
    private readonly profileModel: Model<Profile>
  ) {}

  // Gán manager cho employee
  async assignManager(input: AssignManagerInput): Promise<{
    managerId: Types.ObjectId
    employeeId: Types.ObjectId
    manager: { _id: Types.ObjectId; name?: string; avatarUrl?: string }
    employee: { _id: Types.ObjectId; name?: string; avatarUrl?: string }
  }> {
    // Validate IDs
    if (!Types.ObjectId.isValid(input.managerId)) {
      throw new BadRequestException("Manager ID không hợp lệ")
    }
    if (!Types.ObjectId.isValid(input.employeeId)) {
      throw new BadRequestException("Employee ID không hợp lệ")
    }

    // Check if manager and employee are the same
    if (input.managerId === input.employeeId) {
      throw new BadRequestException("Không thể tự quản lý chính mình")
    }

    // Check if profiles exist
    const [manager, employee] = await Promise.all([
      this.profileModel
        .findById(input.managerId)
        .select("_id name avatarUrl")
        .lean(),
      this.profileModel
        .findById(input.employeeId)
        .select("_id name avatarUrl")
        .lean()
    ])

    if (!manager) {
      throw new NotFoundException("Không tìm thấy manager")
    }
    if (!employee) {
      throw new NotFoundException("Không tìm thấy employee")
    }

    // Check if relationship already exists
    const existing = await this.userManagementModel
      .findOne({
        manager: new Types.ObjectId(input.managerId),
        employee: new Types.ObjectId(input.employeeId)
      })
      .exec()

    if (existing) {
      throw new BadRequestException("Quan hệ quản lý này đã tồn tại")
    }

    // Create new relationship (không dùng upsert nữa vì có thể có nhiều manager)
    await this.userManagementModel.create({
      manager: new Types.ObjectId(input.managerId),
      employee: new Types.ObjectId(input.employeeId)
    })

    return {
      managerId: manager._id as Types.ObjectId,
      employeeId: employee._id as Types.ObjectId,
      manager: {
        _id: manager._id as Types.ObjectId,
        name: manager.name,
        avatarUrl: manager.avatarUrl
      },
      employee: {
        _id: employee._id as Types.ObjectId,
        name: employee.name,
        avatarUrl: employee.avatarUrl
      }
    }
  }

  // Xóa quan hệ quản lý cụ thể (theo manager và employee)
  async removeManagement(
    managerId: string,
    employeeId: string
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new BadRequestException("Manager ID không hợp lệ")
    }
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException("Employee ID không hợp lệ")
    }

    const result = await this.userManagementModel
      .deleteOne({
        manager: new Types.ObjectId(managerId),
        employee: new Types.ObjectId(employeeId)
      })
      .exec()

    if (result.deletedCount === 0) {
      throw new NotFoundException("Không tìm thấy quan hệ quản lý")
    }

    return { message: "Đã xóa quan hệ quản lý" }
  }

  // Xóa tất cả quan hệ quản lý của một employee
  async removeAllManagersOfEmployee(
    employeeId: string
  ): Promise<{ message: string; deletedCount: number }> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException("Employee ID không hợp lệ")
    }

    const result = await this.userManagementModel
      .deleteMany({ employee: new Types.ObjectId(employeeId) })
      .exec()

    return {
      message: `Đã xóa ${result.deletedCount} quan hệ quản lý`,
      deletedCount: result.deletedCount
    }
  }

  // Xóa tất cả nhân viên của một manager
  async removeAllEmployeesOfManager(
    managerId: string
  ): Promise<{ message: string; deletedCount: number }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new BadRequestException("Manager ID không hợp lệ")
    }

    const result = await this.userManagementModel
      .deleteMany({ manager: new Types.ObjectId(managerId) })
      .exec()

    return {
      message: `Đã xóa ${result.deletedCount} quan hệ quản lý`,
      deletedCount: result.deletedCount
    }
  }

  // Lấy danh sách tất cả quan hệ quản lý (có pagination)
  async getAllManagements(input: GetManagementInput): Promise<{
    data: Array<{
      _id: Types.ObjectId
      manager: { _id: Types.ObjectId; name?: string; avatarUrl?: string }
      employee: { _id: Types.ObjectId; name?: string; avatarUrl?: string }
      createdAt: Date
    }>
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))
    const skip = (page - 1) * limit

    const pipeline: any[] = [
      {
        $lookup: {
          from: "profiles",
          localField: "manager",
          foreignField: "_id",
          as: "manager",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "profiles",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                manager: 1,
                employee: 1,
                createdAt: 1
              }
            }
          ],
          count: [{ $count: "total" }]
        }
      }
    ]

    const result = await this.userManagementModel.aggregate(pipeline).exec()
    const first = result[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return {
      data: first.data,
      total,
      page,
      limit,
      totalPages
    }
  }

  // Lấy danh sách manager của một employee
  async getManagersOfEmployee(
    employeeId: string,
    input: GetManagementInput
  ): Promise<{
    data: Array<{
      _id: Types.ObjectId
      name?: string
      avatarUrl?: string
      assignedAt: Date
    }>
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException("Employee ID không hợp lệ")
    }

    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))
    const skip = (page - 1) * limit

    const pipeline: any[] = [
      { $match: { employee: new Types.ObjectId(employeeId) } },
      {
        $lookup: {
          from: "profiles",
          localField: "manager",
          foreignField: "_id",
          as: "manager",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: "$manager._id",
                name: "$manager.name",
                avatarUrl: "$manager.avatarUrl",
                assignedAt: "$createdAt"
              }
            }
          ],
          count: [{ $count: "total" }]
        }
      }
    ]

    const result = await this.userManagementModel.aggregate(pipeline).exec()
    const first = result[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return {
      data: first.data,
      total,
      page,
      limit,
      totalPages
    }
  }

  // Lấy manager của một employee (giữ lại cho backward compatibility, trả về manager đầu tiên)
  async getManagerOfEmployee(employeeId: string): Promise<{
    manager: { _id: Types.ObjectId; name?: string; avatarUrl?: string } | null
  }> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException("Employee ID không hợp lệ")
    }

    const management = await this.userManagementModel
      .findOne({ employee: new Types.ObjectId(employeeId) })
      .populate("manager", "name avatarUrl")
      .lean<Lean<UserManagement>>()

    if (!management) {
      return { manager: null }
    }

    return {
      manager: management.manager as any
    }
  }

  // Lấy danh sách nhân viên của một manager
  async getEmployeesOfManager(
    managerId: string,
    input: GetManagementInput
  ): Promise<{
    data: Array<{
      _id: Types.ObjectId
      name?: string
      avatarUrl?: string
      assignedAt: Date
    }>
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new BadRequestException("Manager ID không hợp lệ")
    }

    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))
    const skip = (page - 1) * limit

    const pipeline: any[] = [
      { $match: { manager: new Types.ObjectId(managerId) } },
      {
        $lookup: {
          from: "profiles",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
          pipeline: [{ $project: { name: 1, avatarUrl: 1 } }]
        }
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: "$employee._id",
                name: "$employee.name",
                avatarUrl: "$employee.avatarUrl",
                assignedAt: "$createdAt"
              }
            }
          ],
          count: [{ $count: "total" }]
        }
      }
    ]

    const result = await this.userManagementModel.aggregate(pipeline).exec()
    const first = result[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return {
      data: first.data,
      total,
      page,
      limit,
      totalPages
    }
  }
}
