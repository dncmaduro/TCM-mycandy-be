import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { UserSchema } from "./schemas/User"
import { OAuthSchema } from "./schemas/OAuth"
import { RoleUserSchema } from "./schemas/RoleUser"
import { TaskSchema } from "./schemas/Task"

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
      }
    ])
  ],
  exports: [MongooseModule]
})
export class DatabaseModule {}
