import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types, Document } from "mongoose"
import { Task, TaskStatus, TaskPriority } from "../database/schemas/Task"

type Lean<T> = Omit<T, keyof Document> & { _id: Types.ObjectId }

type CreateTaskInput = {
  title: string
  sprint: string
  description?: string
  parentTaskId?: string
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
}

type UpdateTaskInput = {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
  sprint?: string
}

type SearchTasksInput = {
  sprint?: string
  searchText?: string
  createdBy?: string
  assignedTo?: string
  priority?: TaskPriority
  status?: TaskStatus
  deleted?: boolean
  tags?: string[]
  page?: number
  limit?: number
}

@Injectable()
export class TasksService {
  constructor(@InjectModel("Task") private readonly taskModel: Model<Task>) {}

  async createTask(
    input: CreateTaskInput,
    createdBy: string
  ): Promise<Lean<Task>> {
    const taskData: any = {
      title: input.title.trim(),
      description: input.description?.trim(),
      priority: input.priority || "medium",
      createdBy: new Types.ObjectId(createdBy),
      tags: input.tags || []
    }

    if (!input.sprint || !Types.ObjectId.isValid(input.sprint)) {
      throw new BadRequestException("Sprint không hợp lệ")
    }

    // verify sprint exists and not deleted
    taskData.sprint = new Types.ObjectId(input.sprint)

    if (input.parentTaskId) {
      if (!Types.ObjectId.isValid(input.parentTaskId)) {
        throw new BadRequestException("parentTaskId không hợp lệ")
      }
      // Kiểm tra task cha tồn tại và task cha không phải là subtask
      const parent = await this.taskModel.findById(input.parentTaskId).exec()
      if (!parent || parent.deletedAt)
        throw new NotFoundException("Task cha không tìm thấy")
      if (parent.parentTaskId)
        throw new BadRequestException(
          "Không thể thêm subtask: task cha đang là subtask"
        )

      taskData.parentTaskId = new Types.ObjectId(input.parentTaskId)
    }
    if (input.assignedTo && Types.ObjectId.isValid(input.assignedTo)) {
      taskData.assignedTo = new Types.ObjectId(input.assignedTo)
    }
    if (input.dueDate) {
      taskData.dueDate = input.dueDate
    }

    const task = await this.taskModel.create(taskData)
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
    if (input.status) {
      updateData.status = input.status
      if (input.status === "completed") updateData.completedAt = new Date()
      else if (task.status === "completed") updateData.completedAt = null
    }
    if (input.priority) updateData.priority = input.priority
    if (input.assignedTo !== undefined) {
      updateData.assignedTo =
        input.assignedTo && Types.ObjectId.isValid(input.assignedTo)
          ? new Types.ObjectId(input.assignedTo)
          : null
    }
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate
    if (input.tags) updateData.tags = input.tags
    if (input.sprint !== undefined) {
      if (!Types.ObjectId.isValid(input.sprint))
        throw new BadRequestException("Sprint không hợp lệ")
      updateData.sprint = new Types.ObjectId(input.sprint)
    }

    const updated = await this.taskModel
      .findByIdAndUpdate(taskId, updateData, { new: true })
      .lean<Lean<Task>>()
      .exec()
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

    const assignedToId =
      assignedTo && Types.ObjectId.isValid(assignedTo)
        ? new Types.ObjectId(assignedTo)
        : null

    const updated = await this.taskModel
      .findByIdAndUpdate(taskId, { assignedTo: assignedToId }, { new: true })
      .lean<Lean<Task>>()
      .exec()

    return updated!
  }

  async searchTasks(
    input: SearchTasksInput
  ): Promise<{ data: Lean<Task>[]; totalPages: number }> {
    const page = Math.max(1, Number(input.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(input.limit) || 20))

    const match: any = {}

    // Only top-level tasks (not subtasks)
    match.parentTaskId = null

    // Sprint filter
    if (input.sprint && Types.ObjectId.isValid(input.sprint)) {
      match.sprint = new Types.ObjectId(input.sprint)
    }

    // Deleted filter
    if (input.deleted === true) {
      match.deletedAt = { $ne: null }
    } else if (input.deleted === false || input.deleted === undefined) {
      match.deletedAt = null
    }

    // Search text filter
    if (input.searchText && input.searchText.trim()) {
      const text = input.searchText.trim()
      match.$or = [
        { title: { $regex: text, $options: "i" } },
        { description: { $regex: text, $options: "i" } }
      ]
    }

    // Other filters
    if (input.createdBy && Types.ObjectId.isValid(input.createdBy)) {
      match.createdBy = new Types.ObjectId(input.createdBy)
    }
    if (input.assignedTo && Types.ObjectId.isValid(input.assignedTo)) {
      match.assignedTo = new Types.ObjectId(input.assignedTo)
    }
    if (input.priority) match.priority = input.priority
    if (input.status) match.status = input.status
    if (input.tags && input.tags.length > 0) {
      match.tags = { $in: input.tags }
    }

    const pipeline: any[] = [
      { $match: match },
      { $sort: { createdAt: -1 as const } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          count: [{ $count: "total" }]
        }
      }
    ]

    const agg = await this.taskModel.aggregate(pipeline).exec()
    const first = agg[0] || { data: [], count: [] }
    const total = (first.count[0]?.total as number) || 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return { data: first.data as Lean<Task>[], totalPages }
  }

  async getSubtasks(parentTaskId: string): Promise<Lean<Task>[]> {
    if (!Types.ObjectId.isValid(parentTaskId)) return []

    return this.taskModel
      .find({
        parentTaskId: new Types.ObjectId(parentTaskId),
        deletedAt: null
      })
      .sort({ createdAt: -1 })
      .lean<Lean<Task>[]>()
      .exec()
  }

  async getTaskById(taskId: string): Promise<Lean<Task> | null> {
    if (!Types.ObjectId.isValid(taskId)) return null
    return this.taskModel
      .findOne({ _id: taskId, deletedAt: null })
      .lean<Lean<Task>>()
      .exec()
  }
}
