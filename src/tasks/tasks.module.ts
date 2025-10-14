import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TaskSchema } from "../database/schemas/Task"
import { TasksService } from "./tasks.service"
import { TasksController } from "./tasks.controller"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Task", schema: TaskSchema }]),
    AuthModule,
    JwtModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
