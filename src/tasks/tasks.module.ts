import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TaskSchema } from "../database/schemas/Task"
import { SprintSchema } from "../database/schemas/Sprint"
import { ProfileSchema } from "../database/schemas/Profile"
import { TasksService } from "./tasks.service"
import { TasksController } from "./tasks.controller"
import { TaskSchedulerService } from "./task-scheduler.service"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { NotificationsModule } from "../notifications/notifications.module"
import { TaskLogsModule } from "../task-logs/task-logs.module"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Task", schema: TaskSchema },
      { name: "Sprint", schema: SprintSchema },
      { name: "Profile", schema: ProfileSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule,
    NotificationsModule,
    TaskLogsModule
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskSchedulerService],
  exports: [TasksService]
})
export class TasksModule {}
