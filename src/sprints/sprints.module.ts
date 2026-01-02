import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { SprintsController } from "./sprints.controller"
import { SprintsService } from "./sprints.service"
import { SprintSchema } from "../database/schemas/Sprint"
import { TaskSchema } from "../database/schemas/Task"
import { JwtModule } from "@nestjs/jwt"
import { AuthModule } from "../auth/auth.module"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { NotificationsModule } from "../notifications/notifications.module"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Sprint", schema: SprintSchema },
      { name: "Task", schema: TaskSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    JwtModule,
    AuthModule,
    NotificationsModule
  ],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService]
})
export class SprintsModule {}
