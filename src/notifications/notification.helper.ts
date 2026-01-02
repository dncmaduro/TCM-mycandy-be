/**
 * Notification Helper
 *
 * File này chứa các helper functions để dễ dàng gửi notifications
 * từ các service khác trong hệ thống.
 *
 * Usage:
 * 1. Inject NotificationsService và NotificationsGateway vào service
 * 2. Gọi các helper functions này
 */

import { NotificationsService } from "./notifications.service"
import { NotificationsGateway } from "./notifications.gateway"
import { NotificationType } from "../database/schemas/Notification"

export class NotificationHelper {
  constructor(
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway
  ) {}

  /**
   * Gửi notification (lưu DB + gửi real-time)
   */
  private async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string
  ) {
    const notification = await this.notificationsService.createNotification({
      userId,
      type,
      title,
      message
    })

    this.notificationsGateway.sendNotificationToUser(userId, notification)
    return notification
  }

  /**
   * Gửi notification cho nhiều users
   */
  private async sendNotificationToMultiple(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string
  ) {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.notificationsService.createNotification({
          userId,
          type,
          title,
          message
        })
      )
    )

    notifications.forEach((notification, index) => {
      this.notificationsGateway.sendNotificationToUser(
        userIds[index],
        notification
      )
    })

    return notifications
  }

  // ==================== TASK NOTIFICATIONS ====================

  async notifyTaskAssigned(
    userId: string,
    taskTitle: string,
    assignedBy: string
  ) {
    return this.sendNotification(
      userId,
      "task_assigned",
      "Bạn được giao task mới",
      `Task "${taskTitle}" đã được giao cho bạn bởi ${assignedBy}`
    )
  }

  async notifyTaskUpdated(
    userId: string,
    taskTitle: string,
    updatedBy: string
  ) {
    return this.sendNotification(
      userId,
      "task_updated",
      "Task được cập nhật",
      `Task "${taskTitle}" đã được cập nhật bởi ${updatedBy}`
    )
  }

  async notifyTaskStatusChanged(
    userId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ) {
    return this.sendNotification(
      userId,
      "task_status_changed",
      "Trạng thái task thay đổi",
      `Task "${taskTitle}" đã chuyển từ ${oldStatus} sang ${newStatus}`
    )
  }

  async notifyTaskDueSoon(userId: string, taskTitle: string, dueDate: Date) {
    return this.sendNotification(
      userId,
      "task_due_soon",
      "Task sắp đến hạn",
      `Task "${taskTitle}" sẽ đến hạn vào ${dueDate.toLocaleDateString("vi-VN")}`
    )
  }

  // ==================== COMMENT NOTIFICATIONS ====================

  async notifyCommentAdded(
    userId: string,
    taskTitle: string,
    commentBy: string
  ) {
    return this.sendNotification(
      userId,
      "comment_added",
      "Comment mới",
      `${commentBy} đã comment trong task "${taskTitle}"`
    )
  }

  async notifyCommentMentioned(
    userId: string,
    taskTitle: string,
    mentionedBy: string
  ) {
    return this.sendNotification(
      userId,
      "comment_mentioned",
      "Bạn được nhắc đến",
      `${mentionedBy} đã nhắc đến bạn trong task "${taskTitle}"`
    )
  }

  // ==================== TIME REQUEST NOTIFICATIONS ====================

  async notifyTimeRequestApproved(userId: string, requestType: string) {
    return this.sendNotification(
      userId,
      "time_request_approved",
      "Yêu cầu được chấp nhận",
      `Yêu cầu ${requestType} của bạn đã được chấp nhận`
    )
  }

  async notifyTimeRequestRejected(userId: string, requestType: string) {
    return this.sendNotification(
      userId,
      "time_request_rejected",
      "Yêu cầu bị từ chối",
      `Yêu cầu ${requestType} của bạn đã bị từ chối`
    )
  }

  async notifyTimeRequestAdded(
    adminIds: string[],
    userName: string,
    requestType: string
  ) {
    return this.sendNotificationToMultiple(
      adminIds,
      "time_request_added",
      "Yêu cầu mới",
      `${userName} đã tạo yêu cầu ${requestType}`
    )
  }

  // ==================== SPRINT NOTIFICATIONS ====================

  async notifySprintStarted(userIds: string[], sprintName: string) {
    return this.sendNotificationToMultiple(
      userIds,
      "sprint_started",
      "Sprint mới bắt đầu",
      `Sprint "${sprintName}" đã bắt đầu`
    )
  }

  // ==================== USER NOTIFICATIONS ====================

  async notifyNewUser(adminIds: string[], userName: string, userEmail: string) {
    return this.sendNotificationToMultiple(
      adminIds,
      "new_user",
      "User mới đăng ký",
      `${userName} (${userEmail}) đã đăng ký tài khoản`
    )
  }
}
