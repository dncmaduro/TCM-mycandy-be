import { NestFactory } from "@nestjs/core"
import { ExpressAdapter } from "@nestjs/platform-express"
import { AppModule } from "./app.module"
import * as express from "express"
import serverless from "serverless-http"

const expressApp = express()
let cachedServer: any = null

async function bootstrap() {
  if (cachedServer) {
    return cachedServer
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  )

  app.setGlobalPrefix("api/v1")
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })

  await app.init()
  cachedServer = serverless(expressApp, {
    binary: ["image/*", "application/pdf"]
  })

  return cachedServer
}

export default async function (req: any, res: any) {
  const server = await bootstrap()
  return server(req, res)
}

// Ensure CommonJS consumers (Vercel builder) get the function on module.exports
;(module as any).exports = (exports as any).default
