import { Injectable } from "@nestjs/common"
import { PrismaService } from "./prisma/prisma.service"

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getHello(): Promise<string> {
    const c = await this.prisma.user.count()
    return `Hello World! users=${c}`
  }
}
