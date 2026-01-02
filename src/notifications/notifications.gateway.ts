import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets"
import { Server, Socket } from "socket.io"
import { Injectable } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"

interface AuthenticatedSocket extends Socket {
  userId?: string
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: "*", // Trong production nên set cụ thể domain
    credentials: true
  }
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  // Map để lưu userId -> socketId
  private userSockets: Map<string, string> = new Map()

  constructor(private jwtService: JwtService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Lấy token từ query hoặc handshake auth
      const token =
        client.handshake.query.token ||
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        console.log("❌ Client connected without token:", client.id)
        client.disconnect()
        return
      }
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token as string)
      const userId = payload.profileId || payload._id

      if (!userId) {
        console.log("❌ Invalid token payload:", client.id)
        client.disconnect()
        return
      }

      // Lưu userId vào socket
      client.userId = userId
      this.userSockets.set(userId, client.id)

      console.log(`✅ User ${userId} connected with socket ${client.id}`)

      // Join room theo userId (để dễ dàng emit tới specific user)
      client.join(`user:${userId}`)
    } catch (error) {
      console.log("❌ Authentication failed:", error.message)
      client.disconnect()
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId)
      console.log(`👋 User ${client.userId} disconnected`)
    }
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit("notification", notification)
    console.log(`📨 Sent notification to user ${userId}`)
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification)
    })
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastNotification(notification: any) {
    this.server.emit("notification", notification)
    console.log("📢 Broadcasted notification to all users")
  }
}
