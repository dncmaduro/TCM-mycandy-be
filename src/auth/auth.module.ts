import { Module, forwardRef } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { ProfilesModule } from "../profiles/profiles.module"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtModule } from "@nestjs/jwt"
import { MongooseModule } from "@nestjs/mongoose"
import { AccountSchema } from "../database/schemas/Account"
import { ProfileSchema } from "../database/schemas/Profile"
import { RefreshSessionSchema } from "./refresh-token.schema"
import { RoleUserSchema } from "../database/schemas/RoleUser"
import { RolesGuard } from "./roles.guard"
import { NotificationsModule } from "../notifications/notifications.module"
import { MailModule } from "../mail/mail.module"

@Module({
  imports: [
    UsersModule,
    forwardRef(() => ProfilesModule),
    JwtModule,
    MongooseModule.forFeature([
      { name: "Account", schema: AccountSchema },
      { name: "Profile", schema: ProfileSchema },
      { name: "RefreshSession", schema: RefreshSessionSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    forwardRef(() => NotificationsModule),
    MailModule
  ],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService, RolesGuard]
})
export class AuthModule {}
