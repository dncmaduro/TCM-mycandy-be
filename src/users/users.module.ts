import { Module } from "@nestjs/common"
import { UsersService } from "./users.service"
import { MongooseModule } from "@nestjs/mongoose"
import { UserSchema } from "../database/schemas/User"
import { OAuthSchema } from "../database/schemas/OAuth"
import { UsersController } from "./users.controller"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "OAuth", schema: OAuthSchema }
    ]),
    JwtModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
