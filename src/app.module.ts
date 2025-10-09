import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { DatabaseModule } from "./database/database.module"
import { MongooseModule } from "@nestjs/mongoose"
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    DatabaseModule,
    MongooseModule.forRoot(process.env.DATABASE_URL, {
      dbName: "data"
    }),
    AuthModule,
    UsersModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
