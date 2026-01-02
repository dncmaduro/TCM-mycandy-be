import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TaskLogsController } from "./task-logs.controller"
import { TaskLogsService } from "./task-logs.service"
import { TaskLogSchema } from "../database/schemas/TaskLog"
import { AuthModule } from "../auth/auth.module"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "TaskLog", schema: TaskLogSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule
  ],
  controllers: [TaskLogsController],
  providers: [TaskLogsService],
  exports: [TaskLogsService]
})
export class TaskLogsModule {}
