import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"

@Module({
  imports: [],
  exports: [MongooseModule]
})
export class DatabaseModule {}
