import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { UserManagementController } from "./user-management.controller"
import { UserManagementService } from "./user-management.service"
import { UserManagementSchema } from "../database/schemas/UserManagement"
import { ProfileSchema } from "../database/schemas/Profile"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"
import { RoleUserSchema } from "../database/schemas/RoleUser"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "UserManagement", schema: UserManagementSchema },
      { name: "Profile", schema: ProfileSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule
  ],
  controllers: [UserManagementController],
  providers: [UserManagementService],
  exports: [UserManagementService]
})
export class UserManagementModule {}
