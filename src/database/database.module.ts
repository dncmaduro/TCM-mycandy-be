import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { UserSchema } from "./schemas/User"
import { OAuthSchema } from "./schemas/OAuth"
import { RoleUserSchema } from "./schemas/RoleUser"
import { TaskSchema } from "./schemas/Task"
import { TaskTagSchema } from "./schemas/TaskTag"
import { SprintSchema } from "./schemas/Sprint"

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
      }
    ])
  ],
  exports: [MongooseModule]
})
export class DatabaseModule {}
