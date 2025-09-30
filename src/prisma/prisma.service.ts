import { Injectable, OnModuleInit, INestApplication } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }

  async enableShutdownHooks(app: INestApplication) {
    // cast to any because Prisma Client's $on typing may not include 'beforeExit' in this version
    ;(this as any).$on("beforeExit", async () => {
      await app.close()
    })
  }
}
