import { Injectable } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Task } from "../database/schemas/Task"
import { NotificationsService } from "../notifications/notifications.service"
import { NotificationsGateway } from "../notifications/notifications.gateway"

@Injectable()
export class TaskSchedulerService {
  constructor(
    @InjectModel("Task") private taskModel: Model<Task>,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway
  ) {}

  /**
   * Chạy mỗi ngày lúc 9h sáng
   * Kiểm tra tasks có deadline trong ngày hôm nay
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkTasksDueToday() {
    console.log("[CRON] Checking tasks due today at 9:00 AM...")

    // Lấy start và end của ngày hôm nay
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    try {
      // Tìm tất cả tasks có deadline trong ngày hôm nay và chưa hoàn thành
      const tasksDueToday = await this.taskModel
        .find({
          deadline: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $ne: "done" }, // Không phải status done
          deletedAt: null,
          assignedTo: { $exists: true, $ne: null }
        })
        .populate("assignedTo", "_id name")
        .lean()

      console.log(`📋 Found ${tasksDueToday.length} tasks due today`)

      // Gửi notification cho từng user
      for (const task of tasksDueToday) {
        if (task.assignedTo && (task.assignedTo as any)._id) {
          const userId = (task.assignedTo as any)._id.toString()

          // Tạo notification
          const notification =
            await this.notificationsService.createNotification({
              userId,
              type: "task_due_soon",
              title: "Task đến hạn hôm nay",
              message: `Task "${task.title}" sẽ đến hạn trong hôm nay`
            })

          // Gửi real-time qua WebSocket
          this.notificationsGateway.sendNotificationToUser(userId, notification)

          console.log(
            `✅ Sent notification to user ${userId} for task "${task.title}"`
          )
        }
      }

      console.log("✅ [CRON] Task due check completed")
    } catch (error) {
      console.error("❌ [CRON] Error checking tasks due today:", error)
    }
  }
}
