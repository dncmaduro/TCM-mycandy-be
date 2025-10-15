import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TaskTagSchema } from "../database/schemas/TaskTag"
import { TaskTagsService } from "./tasktags.service"
import { TaskTagsController } from "./tasktags.controller"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "TaskTag", schema: TaskTagSchema }]),
    AuthModule,
    JwtModule
  ],
  controllers: [TaskTagsController],
  providers: [TaskTagsService],
  exports: [TaskTagsService]
})
export class TaskTagsModule {}
