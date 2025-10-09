import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException
} from "@nestjs/common"
import { JwtPayload } from "./jwt-auth.guard"

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>()
    if (!req.user) throw new UnauthorizedException("User not authenticated")
    return req.user
  }
)

export const CurrentUserField = <K extends keyof JwtPayload>(field: K) =>
  createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload[K] => {
      const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>()
      if (!req.user) throw new UnauthorizedException("User not authenticated")
      return req.user[field]
    }
  )()
