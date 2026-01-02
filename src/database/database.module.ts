import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { UserSchema } from "./schemas/User"
import { OAuthSchema } from "./schemas/OAuth"
import { AccountSchema } from "./schemas/Account"
import { ProfileSchema } from "./schemas/Profile"
import { RoleUserSchema } from "./schemas/RoleUser"
import { TaskSchema } from "./schemas/Task"
import { TaskTagSchema } from "./schemas/TaskTag"
import { SprintSchema } from "./schemas/Sprint"
import { TimeRequestSchema } from "./schemas/TimeRequest"
import { TaskLogSchema } from "./schemas/TaskLog"
import { TaskCommentSchema } from "./schemas/TaskComment"
import { NotificationSchema } from "./schemas/Notification"

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "User",
        schema: UserSchema
      },
      {
        name: "OAuth",
        schema: OAuthSchema
      },
      {
        name: "Account",
        schema: AccountSchema
      },
      {
        name: "Profile",
        schema: ProfileSchema
      },
      {
        name: "RoleUser",
        schema: RoleUserSchema
      },
      {
        name: "Task",
        schema: TaskSchema
      },
      {
        name: "TaskTag",
        schema: TaskTagSchema
      },
      {
        name: "Sprint",
        schema: SprintSchema
      },
      {
        name: "TimeRequest",
        schema: TimeRequestSchema
      },
      {
        name: "TaskLog",
        schema: TaskLogSchema
      },
      {
        name: "TaskComment",
        schema: TaskCommentSchema
      },
      {
        name: "Notification",
        schema: NotificationSchema
      }
    ])
  ],
  exports: [MongooseModule]
})
export class DatabaseModule {}
