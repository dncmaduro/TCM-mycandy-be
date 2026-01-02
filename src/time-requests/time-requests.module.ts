import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TimeRequestsController } from "./time-requests.controller"
import { TimeRequestsService } from "./time-requests.service"
import { TimeRequestSchema } from "../database/schemas/TimeRequest"
import { ProfileSchema } from "../database/schemas/Profile"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"
import { NotificationsModule } from "../notifications/notifications.module"
import { UserManagementModule } from "../user-management/user-management.module"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "TimeRequest", schema: TimeRequestSchema },
      { name: "Profile", schema: ProfileSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule,
    NotificationsModule,
    UserManagementModule
  ],
  controllers: [TimeRequestsController],
  providers: [TimeRequestsService],
  exports: [TimeRequestsService]
})
export class TimeRequestsModule {}
