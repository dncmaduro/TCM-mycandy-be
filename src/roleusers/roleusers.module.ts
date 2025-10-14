import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { RoleUsersService } from "./roleusers.service"
import { RoleUsersController } from "./roleusers.controller"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "RoleUser", schema: RoleUserSchema }]),
    AuthModule,
    JwtModule
  ],
  controllers: [RoleUsersController],
  providers: [RoleUsersService],
  exports: [RoleUsersService]
})
export class RoleUsersModule {}
