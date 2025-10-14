import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtModule } from "@nestjs/jwt"
import { MongooseModule } from "@nestjs/mongoose"
import { RefreshSessionSchema } from "./refresh-token.schema"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { RolesGuard } from "./roles.guard"

@Module({
  imports: [
    UsersModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: "RefreshSession", schema: RefreshSessionSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService, RolesGuard]
})
export class AuthModule {}
