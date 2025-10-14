import { SetMetadata } from "@nestjs/common"
import { ROLES_KEY } from "./roles.guard"
import { Role } from "../database/schemas/RoleUser"

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
