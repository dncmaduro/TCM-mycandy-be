import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from "@nestjs/common"
import { UserManagementService } from "./user-management.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { RolesGuard } from "../auth/roles.guard"
import { Roles } from "../auth/roles.decorator"

@Controller("user-management")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("superadmin")
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  // Gán manager cho employee
  @Post("assign")
  async assignManager(@Body() body: { managerId: string; employeeId: string }) {
    return this.userManagementService.assignManager({
      managerId: body.managerId,
      employeeId: body.employeeId
    })
  }

  // Lấy tất cả quan hệ quản lý (có pagination)
  @Get()
  async getAllManagements(
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.userManagementService.getAllManagements({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })
  }

  // Lấy danh sách manager của một employee (mới - hỗ trợ nhiều manager)
  @Get("employee/:employeeId/managers")
  async getManagersOfEmployee(
    @Param("employeeId") employeeId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.userManagementService.getManagersOfEmployee(employeeId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined
    })
  }

  // Lấy manager của một employee (giữ lại cho backward compatibility)
  @Get("employee/:employeeId/manager")
  async getManagerOfEmployee(@Param("employeeId") employeeId: string) {
    return this.userManagementService.getManagerOfEmployee(employeeId)
  }

  // Lấy danh sách nhân viên của một manager
  @Get("manager/:managerId/employees")
  async getEmployeesOfManager(
    @Param("managerId") managerId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.userManagementService.getEmployeesOfManager(managerId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(page, 10) : undefined
    })
  }

  // Xóa quan hệ quản lý cụ thể (theo manager và employee)
  @Delete("manager/:managerId/employee/:employeeId")
  async removeManagement(
    @Param("managerId") managerId: string,
    @Param("employeeId") employeeId: string
  ) {
    return this.userManagementService.removeManagement(managerId, employeeId)
  }

  // Xóa tất cả manager của một employee
  @Delete("employee/:employeeId/all-managers")
  async removeAllManagersOfEmployee(@Param("employeeId") employeeId: string) {
    return this.userManagementService.removeAllManagersOfEmployee(employeeId)
  }

  // Xóa tất cả nhân viên của một manager
  @Delete("manager/:managerId/all-employees")
  async removeAllEmployeesOfManager(@Param("managerId") managerId: string) {
    return this.userManagementService.removeAllEmployeesOfManager(managerId)
  }
}
