import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { ScheduleModule } from "@nestjs/schedule"
import { DatabaseModule } from "./database/database.module"
import { MongooseModule } from "@nestjs/mongoose"
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"
import { ProfilesModule } from "./profiles/profiles.module"
import { RoleUsersModule } from "./roleusers/roleusers.module"
import { TasksModule } from "./tasks/tasks.module"
import { TaskTagsModule } from "./tasktags/tasktags.module"
import { SprintsModule } from "./sprints/sprints.module"
import { TimeRequestsModule } from "./time-requests/time-requests.module"
import { TaskLogsModule } from "./task-logs/task-logs.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { UserManagementModule } from "./user-management/user-management.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MongooseModule.forRoot(process.env.DATABASE_URL, {
      dbName: "data"
    }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    RoleUsersModule,
    TasksModule,
    TaskTagsModule,
    SprintsModule,
    TimeRequestsModule,
    TaskLogsModule,
    NotificationsModule,
    UserManagementModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
