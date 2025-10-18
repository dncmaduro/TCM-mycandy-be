import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TimeRequestsController } from "./time-requests.controller"
import { TimeRequestsService } from "./time-requests.service"
import { TimeRequestSchema } from "../database/schemas/TimeRequest"
import { AuthModule } from "../auth/auth.module"
import { JwtModule } from "@nestjs/jwt"
import { RoleUserSchema } from "src/database/schemas/RoleUser"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "TimeRequest", schema: TimeRequestSchema },
      { name: "RoleUser", schema: RoleUserSchema }
    ]),
    AuthModule,
    JwtModule
  ],
  controllers: [TimeRequestsController],
  providers: [TimeRequestsService],
  exports: [TimeRequestsService]
})
export class TimeRequestsModule {}
