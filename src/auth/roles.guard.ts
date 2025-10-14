import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { JwtService } from "@nestjs/jwt"
import { Request } from "express"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { RoleUser, Role } from "../database/schemas/RoleUser"

export const ROLES_KEY = "roles"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectModel("RoleUser") private readonly roleUserModel: Model<RoleUser>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.headers.authorization
    if (!auth) throw new ForbiddenException("Thiếu header Authorization")
    const [scheme, token] = auth.split(" ")
    if (scheme !== "Bearer" || !token)
      throw new ForbiddenException("Định dạng Authorization không hợp lệ")

    let sub: string
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET!
      }) as { sub: string }
      sub = payload.sub
    } catch {
      throw new ForbiddenException("Access token không hợp lệ")
    }

    const doc = await this.roleUserModel
      .findOne({ userId: sub })
      .lean<{ role: Role }>()
      .exec()
    const current = doc?.role

    const ok = current ? requiredRoles.includes(current) : false
    if (!ok) throw new ForbiddenException("Không đủ quyền (role)")
    return true
  }
}
