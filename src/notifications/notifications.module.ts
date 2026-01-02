import { Module, forwardRef } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { NotificationsController } from "./notifications.controller"
import { NotificationsService } from "./notifications.service"
import { NotificationsGateway } from "./notifications.gateway"
import { NotificationSchema } from "../database/schemas/Notification"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Notification", schema: NotificationSchema }
    ]),
    forwardRef(() => AuthModule),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: "1d" }
      })
    })
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway]
})
export class NotificationsModule {}
