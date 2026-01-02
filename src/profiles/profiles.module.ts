import { Module, forwardRef } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ProfileSchema } from "../database/schemas/Profile"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { ProfilesService } from "./profiles.service"
import { ProfilesController } from "./profiles.controller"
import { JwtModule } from "@nestjs/jwt"
import { AuthModule } from "../auth/auth.module"

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "Profile",
        schema: ProfileSchema
      },
      {
        name: "RoleUser",
        schema: RoleUserSchema
      }
    ]),
    JwtModule,
    forwardRef(() => AuthModule)
  ],
  providers: [ProfilesService],
  controllers: [ProfilesController],
  exports: [ProfilesService]
})
export class ProfilesModule {}
