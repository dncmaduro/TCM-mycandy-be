import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TaskSchema } from "../database/schemas/Task"
import { SprintSchema } from "../database/schemas/Sprint"
import { TasksService } from "./tasks.service"
import { TasksController } from "./tasks.controller"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"
import { RoleUserSchema } from "../database/schemas/RoleUser"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Task", schema: TaskSchema },
      { name: "Sprint", schema: SprintSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
