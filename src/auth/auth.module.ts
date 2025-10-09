import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtModule } from "@nestjs/jwt"
import { MongooseModule } from "@nestjs/mongoose"
import { RefreshSessionSchema } from "./refresh-token.schema"

@Module({
  imports: [
    UsersModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: "RefreshSession", schema: RefreshSessionSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
