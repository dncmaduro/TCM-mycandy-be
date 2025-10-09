import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { Request } from "express"

export interface JwtPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>()
    const auth =
      req.headers.authorization ||
      (req.headers.Authorization as string | undefined)
    if (!auth) throw new UnauthorizedException("Missing Authorization header")
    const [scheme, token] = auth.split(" ")
    if (scheme !== "Bearer" || !token)
      throw new UnauthorizedException("Invalid Authorization format")
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET!
      })
      req.user = payload
      return true
    } catch (e: any) {
      if (e?.name === "TokenExpiredError")
        throw new UnauthorizedException("Access token expired")
      throw new UnauthorizedException("Invalid access token")
    }
  }
}
