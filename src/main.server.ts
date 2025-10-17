import { NestFactory } from "@nestjs/core"
import { ExpressAdapter } from "@nestjs/platform-express"
import { AppModule } from "./app.module"
import * as express from "express"
import serverless from "serverless-http"

const expressApp = express()
let handler: any = null

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  )
  const { PORT } = process.env
  app.setGlobalPrefix("api/v1")
  app.enableCors()
  expressApp.use(express.json())
  await app.init()
  handler = serverless(expressApp)
}

export default async function (req: any, res: any) {
  if (!handler) {
    await bootstrap()
  }
  return handler(req, res)
}

// Ensure CommonJS consumers (Vercel builder) get the function on module.exports
;(module as any).exports = (exports as any).default
