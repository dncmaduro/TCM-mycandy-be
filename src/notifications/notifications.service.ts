import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import {
  Notification,
  NotificationType
} from "../database/schemas/Notification"

export interface CreateNotificationDto {
  userId: string
  type: NotificationType
  title: string
  message: string
}

export interface GetNotificationsDto {
  page?: number
  isRead?: boolean | null // true/false/null
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel("Notification") private notificationModel: Model<Notification>
  ) {}

  /**
   * 1. Tạo notification
   */
  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(dto.userId),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      isRead: false
    })

    return notification.toObject()
  }

  /**
   * 2. Get notifications của 1 user
   * Limit cố định: 20
   * Filter: page, isRead (true/false/null)
   */
  async getNotifications(userId: string, dto: GetNotificationsDto) {
    const page = dto.page || 1
    const limit = 20 // Cố định
    const skip = (page - 1) * limit

    // Build filter
    const filter: any = {
      userId: new Types.ObjectId(userId)
    }

    // Filter theo isRead
    if (dto.isRead !== undefined && dto.isRead !== null) {
      filter.isRead = dto.isRead
    }
    // Nếu isRead = null hoặc undefined, không filter (lấy tất cả)

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter)
    ])

    return {
      data: notifications,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false
      }),
      page
    }
  }

  /**
   * 3. Set all notifications as read
   */
  async setAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    )

    return {
      message: "Đã đánh dấu tất cả thông báo là đã đọc"
    }
  }

  /**
   * 4. Set 1 notification as read
   */
  async setAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId)
      },
      {
        $set: { isRead: true }
      },
      { new: true }
    )

    if (!notification) {
      throw new Error("Không tìm thấy thông báo hoặc bạn không có quyền")
    }

    return {
      message: "Đã đánh dấu thông báo là đã đọc",
      notification: notification.toObject()
    }
  }

  /**
   * 5. Set 1 notification as unread
   */
  async setAsUnread(userId: string, notificationId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId)
      },
      {
        $set: { isRead: false }
      },
      { new: true }
    )

    if (!notification) {
      throw new Error("Không tìm thấy thông báo hoặc bạn không có quyền")
    }

    return {
      message: "Đã đánh dấu thông báo là chưa đọc",
      notification: notification.toObject()
    }
  }

  /**
   * Get unread count (helper method)
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false
    })
  }
}
