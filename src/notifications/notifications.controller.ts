import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards
} from "@nestjs/common"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import {
  NotificationsService,
  CreateNotificationDto
} from "./notifications.service"
import { NotificationsGateway } from "./notifications.gateway"
import { CurrentUser } from "../auth/current-user.decorator"

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway
  ) {}

  /**
   * 1. Tạo notification
   * POST /notifications
   * Note: Thường được gọi internally từ các service khác
   */
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.createNotification(dto)

    // Gửi notification qua WebSocket real-time
    this.notificationsGateway.sendNotificationToUser(dto.userId, notification)

    return { notification }
  }

  /**
   * 2. Get notifications của user hiện tại
   * GET /notifications?page=1&isRead=true|false
   * Limit cố định: 20
   */
  @Get()
  async getNotifications(
    @Query() query: any,
    @CurrentUser() user: { profileId: string }
  ) {
    const userId = user.profileId

    // Parse isRead từ string sang boolean hoặc null
    let isRead: boolean | null = null
    if (query.isRead === "true" || query.isRead === true) {
      isRead = true
    } else if (query.isRead === "false" || query.isRead === false) {
      isRead = false
    }

    return this.notificationsService.getNotifications(userId, {
      page: query.page ? parseInt(query.page) : undefined,
      isRead
    })
  }

  /**
   * 3. Set all notifications as read
   * POST /notifications/read-all
   */
  @Post("read-all")
  async setAllAsRead(@CurrentUser() user: { profileId: string }) {
    const userId = user.profileId
    return this.notificationsService.setAllAsRead(userId)
  }

  /**
   * 4. Set 1 notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(":id/read")
  async setAsRead(
    @Param("id") id: string,
    @CurrentUser() user: { profileId: string }
  ) {
    const userId = user.profileId
    return this.notificationsService.setAsRead(userId, id)
  }

  /**
   * 5. Set 1 notification as unread
   * PATCH /notifications/:id/unread
   */
  @Patch(":id/unread")
  async setAsUnread(
    @Param("id") id: string,
    @CurrentUser() user: { profileId: string }
  ) {
    const userId = user.profileId
    return this.notificationsService.setAsUnread(userId, id)
  }

  /**
   * Get unread count
   * GET /notifications/unread-count
   */
  @Get("unread-count")
  async getUnreadCount(@CurrentUser() user: { profileId: string }) {
    const userId = user.profileId
    const count = await this.notificationsService.getUnreadCount(userId)
    return { unreadCount: count }
  }
}
