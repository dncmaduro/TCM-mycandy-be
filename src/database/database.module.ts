import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { UserSchema } from "./schemas/User"
import { OAuthSchema } from "./schemas/OAuth"

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
      }
    ])
  ],
  exports: [MongooseModule]
})
export class DatabaseModule {}
