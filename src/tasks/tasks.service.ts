import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { Task, TaskPriority } from "../database/schemas/Task"
import { Sprint } from "../database/schemas/Sprint"
import { NotificationsService } from "../notifications/notifications.service"
import { NotificationsGateway } from "../notifications/notifications.gateway"
import { Profile } from "../database/schemas/Profile"
import { TaskLogsService } from "../task-logs/task-logs.service"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type CreateTaskInput = {
  title: string
  sprint: string
  description?: string
  aim?: number
  aimUnit?: string
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
  estimateHours?: number
  evaluation?: string
}

type UpdateTaskInput = {
  title?: string
  description?: string
  aim?: number
  aimUnit?: string
  progress?: number
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
  sprint?: string
  estimateHours?: number
  evaluation?: string
}

type SearchTasksInput = {
  sprint?: string
  searchText?: string
  createdBy?: string
  assignedTo?: string
  priority?: TaskPriority
  deleted?: boolean
  tags?: string[]
  page?: number
  limit?: number
}

type UserSprintStat = {
  profile: Lean<Profile>
  totalTasks: number
  totalUnits: number
  completedTasks: number
  completedUnits: number
  totalEstimateHours: number
}
@Injectable()
export class TasksService {
  constructor(
    @InjectModel("Task") private readonly taskModel: Model<Task>,
    @InjectModel("Sprint") private readonly sprintModel: Model<Sprint>,
    @InjectModel("Profile") private readonly profileModel: Model<Profile>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private taskLogsService: TaskLogsService
  ) {}

  async createTask(
    input: CreateTaskInput,
    createdBy: string
  ): Promise<Lean<Task>> {
    const taskData: any = {
      title: input.title.trim(),
      description: input.description?.trim(),
      priority: input.priority || "medium",
      aim: input.aim || 0,
      aimUnit: input.aimUnit || "",
      progress: 0,
      createdBy: new Types.ObjectId(createdBy),
      tags: input.tags || [],
      estimateHours: input.estimateHours,
      evaluation: input.evaluation?.trim()
    }

    if (!input.sprint || !Types.ObjectId.isValid(input.sprint)) {
      throw new BadRequestException("Sprint không hợp lệ")
    }

    taskData.sprint = new Types.ObjectId(input.sprint)

    if (input.assignedTo && Types.ObjectId.isValid(input.assignedTo)) {
      taskData.assignedTo = new Types.ObjectId(input.assignedTo)
    }
    if (input.dueDate) {
      taskData.dueDate = input.dueDate
    }

    const task = await this.taskModel.create(taskData)

    // Gửi notification nếu task được assign cho user
    if (input.assignedTo) {
      try {
        const creator = await this.profileModel.findById(createdBy).lean()
        const notification = await this.notificationsService.createNotification(
          {
            userId: input.assignedTo,
            type: "task_assigned",
            title: "Bạn được giao task mới",
            message: `Task "${input.title}" đã được giao cho bạn bởi ${creator?.name || "Admin"}`
          }
        )
        this.notificationsGateway.sendNotificationToUser(
          input.assignedTo,
          notification
        )
      } catch (error) {
        console.error("Error sending task_assigned notification:", error)
      }

      // Tạo task log cho assignment
      try {
        const assignedToProfile = await this.profileModel
          .findById(input.assignedTo)
          .select("_id name avatarUrl")
          .lean()
        const assignedByProfile = await this.profileModel
          .findById(createdBy)
          .select("_id name avatarUrl")
          .lean()

        await this.taskLogsService.createLog({
          taskId: task._id.toString(),
          type: "assignment",
          userId: createdBy,
          meta: {
            assignedTo: assignedToProfile
              ? {
                  _id: assignedToProfile._id.toString(),
                  name: assignedToProfile.name,
                  avatarUrl: assignedToProfile.avatarUrl
                }
              : null,
            assignedBy: assignedByProfile
              ? {
                  _id: assignedByProfile._id.toString(),
                  name: assignedByProfile.name,
                  avatarUrl: assignedByProfile.avatarUrl
                }
              : null
          }
        })
      } catch (error) {
        console.error("Error creating assignment task log:", error)
      }
    }

    return task.toObject() as Lean<Task>
  }

  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    userId: string
  ): Promise<Lean<Task>> {
    if (!Types.ObjectId.isValid(taskId))
      throw new NotFoundException("Không tìm thấy task")

    const task = await this.taskModel
      .findOne({
        _id: taskId,
        deletedAt: null
      })
      .exec()

    if (!task) throw new NotFoundException("Không tìm thấy task")
    if (task.createdBy.toString() !== userId)
      throw new ForbiddenException("Không có quyền cập nhật task này")

    const updateData: any = {}
    if (input.title) updateData.title = input.title.trim()
    if (input.description !== undefined)
      updateData.description = input.description?.trim()

    // Update aim/aimUnit/progress
    if (input.aim !== undefined) {
      if (input.aim < 0) {
        throw new BadRequestException("Aim phải >= 0")
      }
      updateData.aim = input.aim
    }
    if (input.aimUnit) updateData.aimUnit = input.aimUnit
    if (input.progress !== undefined) {
      const finalAim = input.aim !== undefined ? input.aim : task.aim
      if (input.progress < 0 || input.progress > finalAim) {
        throw new BadRequestException(
          `Progress phải trong khoảng 0-${finalAim}`
        )
      }
      updateData.progress = input.progress

      // Tự động set completedAt khi progress === aim
      if (input.progress === finalAim) {
        updateData.completedAt = new Date()
      } else if (task.completedAt) {
        updateData.completedAt = null
      }
    }

    if (input.priority) updateData.priority = input.priority

    const oldAssignedTo = task.assignedTo?.toString()
    const oldSprint = task.sprint?.toString()
    if (input.assignedTo !== undefined) {
      updateData.assignedTo =
        input.assignedTo && Types.ObjectId.isValid(input.assignedTo)
          ? new Types.ObjectId(input.assignedTo)
          : null
    }
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate
    if (input.tags) updateData.tags = input.tags
    if (input.estimateHours !== undefined)
      updateData.estimateHours = input.estimateHours
    if (input.evaluation !== undefined)
      updateData.evaluation = input.evaluation?.trim()
    if (input.sprint !== undefined) {
      if (!Types.ObjectId.isValid(input.sprint))
        throw new BadRequestException("Sprint không hợp lệ")
      updateData.sprint = new Types.ObjectId(input.sprint)
    }

    const updated = await this.taskModel
      .findByIdAndUpdate(taskId, updateData, { new: true })
      .lean<Lean<Task>>()
      .exec()

    // Gửi notification khi assignedTo thay đổi
    if (
      input.assignedTo !== undefined &&
      input.assignedTo !== oldAssignedTo &&
      input.assignedTo
    ) {
      try {
        const updater = await this.profileModel.findById(userId).lean()
        const notification = await this.notificationsService.createNotification(
          {
            userId: input.assignedTo,
            type: "task_assigned",
            title: "Bạn được giao task mới",
            message: `Task "${task.title}" đã được giao cho bạn bởi ${updater?.name || "Admin"}`
          }
        )
        this.notificationsGateway.sendNotificationToUser(
          input.assignedTo,
          notification
        )
      } catch (error) {
        console.error("Error sending task_assigned notification:", error)
      }

      // Tạo task log cho assignment change
      try {
        const oldProfile = oldAssignedTo
          ? await this.profileModel
              .findById(oldAssignedTo)
              .select("_id name avatarUrl")
              .lean()
          : null
        const newProfile = await this.profileModel
          .findById(input.assignedTo)
          .select("_id name avatarUrl")
          .lean()
        const assignedByProfile = await this.profileModel
          .findById(userId)
          .select("_id name avatarUrl")
          .lean()
        console.log("a")

        await this.taskLogsService.createLog({
          taskId: taskId,
          type: "assignment",
          userId: userId,
          meta: {
            oldAssignedTo: oldProfile
              ? {
                  _id: oldProfile._id.toString(),
                  name: oldProfile.name,
                  avatarUrl: oldProfile.avatarUrl
                }
              : null,
            newAssignedTo: newProfile
              ? {
                  _id: newProfile._id.toString(),
                  name: newProfile.name,
                  avatarUrl: newProfile.avatarUrl
                }
              : null,
            assignedBy: assignedByProfile
              ? {
                  _id: assignedByProfile._id.toString(),
                  name: assignedByProfile.name,
                  avatarUrl: assignedByProfile.avatarUrl
                }
              : null
          }
        })
      } catch (error) {
        console.error("Error creating assignment task log:", error)
      }
    }

    // Tạo task log cho sprint change
    if (input.sprint !== undefined && input.sprint !== oldSprint) {
      try {
        const oldSprintDoc = oldSprint
          ? await this.sprintModel.findById(oldSprint).select("_id name").lean()
          : null
        const newSprintDoc = await this.sprintModel
          .findById(input.sprint)
          .select("_id name")
          .lean()
        const changedByProfile = await this.profileModel
          .findById(userId)
          .select("_id name avatarUrl")
          .lean()

        await this.taskLogsService.createLog({
          taskId: taskId,
          type: "sprint_change",
          userId: userId,
          meta: {
            oldSprint: oldSprintDoc
              ? {
                  _id: oldSprintDoc._id.toString(),
                  name: oldSprintDoc.name
                }
              : null,
            newSprint: newSprintDoc
              ? {
                  _id: newSprintDoc._id.toString(),
                  name: newSprintDoc.name
                }
              : null,
            changedBy: changedByProfile
              ? {
                  _id: changedByProfile._id.toString(),
                  name: changedByProfile.name,
                  avatarUrl: changedByProfile.avatarUrl
                }
              : null
          }
        })
      } catch (error) {
        console.error("Error creating sprint_change task log:", error)
      }
    }

    // Tạo task log cho update_information
    const updatedFields: string[] = []
    const oldValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}

    if (input.title && input.title !== task.title) {
      updatedFields.push("title")
      oldValues.title = task.title
      newValues.title = input.title
    }
    if (
      input.description !== undefined &&
      input.description !== task.description
    ) {
      updatedFields.push("description")
      oldValues.description = task.description
      newValues.description = input.description
    }
    if (input.aim !== undefined && input.aim !== task.aim) {
      updatedFields.push("aim")
      oldValues.aim = task.aim
      newValues.aim = input.aim
    }
    if (input.aimUnit && input.aimUnit !== task.aimUnit) {
      updatedFields.push("aimUnit")
      oldValues.aimUnit = task.aimUnit
      newValues.aimUnit = input.aimUnit
    }
    if (input.progress !== undefined && input.progress !== task.progress) {
      updatedFields.push("progress")
      oldValues.progress = task.progress
      newValues.progress = input.progress
    }
    if (input.priority && input.priority !== task.priority) {
      updatedFields.push("priority")
      oldValues.priority = task.priority
      newValues.priority = input.priority
    }
    if (
      input.dueDate !== undefined &&
      input.dueDate?.toString() !== task.dueDate?.toString()
    ) {
      updatedFields.push("dueDate")
      oldValues.dueDate = task.dueDate
      newValues.dueDate = input.dueDate
    }
    if (
      input.tags &&
      JSON.stringify(input.tags) !== JSON.stringify(task.tags)
    ) {
      updatedFields.push("tags")
      oldValues.tags = task.tags
      newValues.tags = input.tags
    }

    if (updatedFields.length > 0) {
      try {
        await this.taskLogsService.createLog({
          taskId: taskId,
          type: "update_information",
          userId: userId,
          meta: {
            fields: updatedFields,
            oldValues,
            newValues
          }
        })
      } catch (error) {
        console.error("Error creating update_information task log:", error)
      }
    }

    return updated!
  }

  async deleteTask(
    taskId: string,
    userId: string
  ): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(taskId))
      throw new NotFoundException("Không tìm thấy task")

    const task = await this.taskModel
      .findOne({
        _id: taskId,
        deletedAt: null
      })
      .exec()

    if (!task) throw new NotFoundException("Không tìm thấy task")
    if (task.createdBy.toString() !== userId)
      throw new ForbiddenException("Không có quyền xóa task này")

    await this.taskModel
      .findByIdAndUpdate(taskId, { deletedAt: new Date() })
      .exec()
    return { deleted: true }
  }

  async assignTask(
    taskId: string,
    assignedTo: string | null,
    userId: string
  ): Promise<Lean<Task>> {
    if (!Types.ObjectId.isValid(taskId))
      throw new NotFoundException("Không tìm thấy task")

    const task = await this.taskModel
      .findOne({
        _id: taskId,
        deletedAt: null
      })
      .exec()

    if (!task) throw new NotFoundException("Không tìm thấy task")
    if (task.createdBy.toString() !== userId)
      throw new ForbiddenException("Không có quyền phân công task này")

    const oldAssignedTo = task.assignedTo?.toString()
    const assignedToId =
      assignedTo && Types.ObjectId.isValid(assignedTo)
        ? new Types.ObjectId(assignedTo)
        : null

    const updated = await this.taskModel
      .findByIdAndUpdate(taskId, { assignedTo: assignedToId }, { new: true })
      .lean<Lean<Task>>()
      .exec()

    // Tạo task log cho assignment
    if (oldAssignedTo !== assignedTo) {
      try {
        const oldProfile = oldAssignedTo
          ? await this.profileModel
              .findById(oldAssignedTo)
              .select("_id name avatarUrl")
              .lean()
          : null
        const newProfile = assignedTo
          ? await this.profileModel
              .findById(assignedTo)
              .select("_id name avatarUrl")
              .lean()
          : null
        const assignedByProfile = await this.profileModel
          .findById(userId)
          .select("_id name avatarUrl")
          .lean()

        await this.taskLogsService.createLog({
          taskId: taskId,
          type: "assignment",
          userId: userId,
          meta: {
            oldAssignedTo: oldProfile
              ? {
                  _id: oldProfile._id.toString(),
                  name: oldProfile.name,
                  avatarUrl: oldProfile.avatarUrl
                }
              : null,
            newAssignedTo: newProfile
              ? {
                  _id: newProfile._id.toString(),
                  name: newProfile.name,
                  avatarUrl: newProfile.avatarUrl
                }
              : null,
            assignedBy: assignedByProfile
              ? {
                  _id: assignedByProfile._id.toString(),
                  name: assignedByProfile.name,
                  avatarUrl: assignedByProfile.avatarUrl
                }
              : null
          }
        })
      } catch (error) {
        console.error("Error creating assignment task log:", error)
      }
    }

    return updated!
  }

  async searchTasks(
    input: SearchTasksInput
  ): Promise<{ data: Task[]; total: number }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))
    const skip = (page - 1) * limit

    const filter: any = {}

    // Sprint filter
    if (input.sprint && Types.ObjectId.isValid(input.sprint)) {
      filter.sprint = new Types.ObjectId(input.sprint)
    }

    // Deleted filter
    if (input.deleted === true) {
      filter.deletedAt = { $ne: null }
    } else {
      filter.deletedAt = null
    }

    // Search text filter
    if (input.searchText && input.searchText.trim()) {
      const text = input.searchText.trim()
      filter.$or = [
        { title: { $regex: text, $options: "i" } },
        { description: { $regex: text, $options: "i" } }
      ]
    }

    // Other filters
    if (input.createdBy && Types.ObjectId.isValid(input.createdBy)) {
      filter.createdBy = new Types.ObjectId(input.createdBy)
    }
    if (input.assignedTo && Types.ObjectId.isValid(input.assignedTo)) {
      filter.assignedTo = new Types.ObjectId(input.assignedTo)
    }
    if (input.priority) filter.priority = input.priority
    if (input.tags?.length) filter.tags = { $in: input.tags }

    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo")
        .populate("createdBy")
        .populate("sprint")
        .exec(),
      this.taskModel.countDocuments(filter).exec()
    ])

    return { data, total }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    if (!Types.ObjectId.isValid(taskId)) return null
    return this.taskModel
      .findOne({ _id: taskId, deletedAt: null })
      .populate("assignedTo")
      .populate("createdBy")
      .populate("sprint")
      .exec()
  }

  async getCurrentSprintUserStats(profileId: string): Promise<{
    totalTasks: number
    totalUnits: number
    completedTasks: number
    completedUnits: number
    totalEstimateHours: number
  }> {
    if (!Types.ObjectId.isValid(profileId)) {
      throw new BadRequestException("Profile ID không hợp lệ")
    }

    // Lấy sprint hiện tại
    const currentSprint = await this.sprintModel
      .findOne({ isCurrent: true, deletedAt: null })
      .exec()

    if (!currentSprint) {
      return {
        totalTasks: 0,
        totalUnits: 0,
        completedTasks: 0,
        completedUnits: 0,
        totalEstimateHours: 0
      }
    }

    const pipeline = [
      {
        $match: {
          sprint: currentSprint._id,
          assignedTo: new Types.ObjectId(profileId),
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          totalUnits: { $sum: "$aim" },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ["$progress", "$aim"] }, 1, 0]
            }
          },
          completedUnits: { $sum: "$progress" },
          totalEstimateHours: { $sum: { $ifNull: ["$estimateHours", 0] } }
        }
      }
    ]

    const result = await this.taskModel.aggregate(pipeline).exec()

    if (result.length === 0) {
      return {
        totalTasks: 0,
        totalUnits: 0,
        completedTasks: 0,
        completedUnits: 0,
        totalEstimateHours: 0
      }
    }

    const stats = result[0]
    return {
      totalTasks: stats.totalTasks,
      totalUnits: stats.totalUnits,
      completedTasks: stats.completedTasks,
      completedUnits: stats.completedUnits,
      totalEstimateHours: stats.totalEstimateHours || 0
    }
  }

  async getCurrentSprintAllUsersStats(): Promise<{
    users: Array<UserSprintStat>
  }> {
    // Lấy sprint hiện tại
    const currentSprint = await this.sprintModel
      .findOne({ isCurrent: true, deletedAt: null })
      .lean()
      .exec()

    if (!currentSprint?._id) return { users: [] }

    // Lấy tasks của sprint hiện tại + populate assignedTo (Profile)
    const tasks = await this.taskModel
      .find({
        sprint: currentSprint._id,
        assignedTo: { $ne: null },
        deletedAt: null
      })
      .select("assignedTo aim progress estimateHours") // thêm estimateHours
      .populate({
        path: "assignedTo",
        model: "Profile",
        select: "_id name avatarUrl" // tuỳ bạn muốn fields nào
      })
      .lean<
        Array<
          Pick<Task, "aim" | "progress" | "estimateHours"> & {
            assignedTo: Lean<Profile> | null
          }
        >
      >()
      .exec()

    // Group trong Node
    const map = new Map<string, UserSprintStat>()

    for (const t of tasks) {
      const profile = t.assignedTo
      if (!profile) continue

      const key = String(profile._id)
      let stat = map.get(key)

      if (!stat) {
        stat = {
          profile,
          totalTasks: 0,
          totalUnits: 0,
          completedTasks: 0,
          completedUnits: 0,
          totalEstimateHours: 0
        }
        map.set(key, stat)
      }

      const aim = Number(t.aim ?? 0)
      const progress = Number(t.progress ?? 0)
      const estimateHours = Number(t.estimateHours ?? 0)

      stat.totalTasks += 1
      stat.totalUnits += aim
      stat.completedUnits += progress
      stat.totalEstimateHours += estimateHours

      // “Completed” theo logic cũ: progress == aim
      if (progress === aim) stat.completedTasks += 1
    }

    const users = Array.from(map.values()).sort(
      (a, b) => b.completedUnits - a.completedUnits
    )

    return { users }
  }
}
