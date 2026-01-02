import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { Account } from "../database/schemas/Account"
import { Profile } from "../database/schemas/Profile"
import { RefreshSession } from "./refresh-token.schema"
import { RoleUser } from "../database/schemas/RoleUser"
import { ProfilesService } from "../profiles/profiles.service"
import { NotificationsService } from "../notifications/notifications.service"
import { NotificationsGateway } from "../notifications/notifications.gateway"
import { createHash, randomBytes } from "node:crypto"
import * as bcrypt from "bcrypt"
import { MailService } from "../mail/mail.service"

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name)

  constructor(
    private readonly jwtService: JwtService,
    @InjectModel("Account")
    private readonly accountModel: Model<Account>,
    @InjectModel("Profile")
    private readonly profileModel: Model<Profile>,
    @InjectModel("RefreshSession")
    private readonly refreshSessionModel: Model<RefreshSession>,
    @InjectModel("RoleUser")
    private readonly roleUserModel: Model<RoleUser>,
    private readonly profilesService: ProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly mailService: MailService
  ) {}

  async register(email: string, password: string, name?: string) {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    // Check if account exists
    const existingAccount = await this.accountModel
      .findOne({ email: normalizedEmail })
      .exec()

    if (existingAccount) {
      throw new ConflictException("Email đã được sử dụng")
    }

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create account
    const account = await this.accountModel.create({
      email: normalizedEmail,
      passwordHash,
      isVerified: false, // có thể yêu cầu verify email
      verificationToken: randomBytes(32).toString("hex")
    })

    // Create profile
    const { profile } = await this.profilesService.createProfile(
      account._id.toString(),
      { name }
    )

    // Link profile to account
    account.profileId = profile._id as Types.ObjectId
    await account.save()

    // Tạo RoleUser với role mặc định là "user"
    try {
      await this.roleUserModel.create({
        profileId: profile._id,
        roles: ["user"]
      })
    } catch (error) {
      console.error("Error creating default role for user:", error)
    }

    // Gửi notification cho admin
    try {
      // Tìm các profile có role admin hoặc superadmin
      const adminRoles = await this.roleUserModel
        .find({
          roles: { $in: ["admin", "superadmin"] }
        })
        .lean()

      // adminRoles[].profileId là ObjectId, cần convert sang string
      for (const adminRole of adminRoles) {
        const adminProfileId = adminRole.profileId.toString()
        const notification = await this.notificationsService.createNotification(
          {
            userId: adminProfileId,
            type: "new_user",
            title: "User mới đăng ký",
            message: `${name || email} đã đăng ký tài khoản`
          }
        )
        this.notificationsGateway.sendNotificationToUser(
          adminProfileId,
          notification
        )
      }
    } catch (error) {
      console.error("Error sending new_user notification:", error)
    }

    return {
      message: "Đăng ký thành công",
      accountId: account._id,
      profileId: profile._id,
      // TODO: Gửi email verification nếu cần
      verificationRequired: true
    }
  }

  async login(email: string, password: string) {
    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    // Find account
    const account = await this.accountModel
      .findOne({ email: normalizedEmail })
      .exec()

    if (!account) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng")
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng")
    }

    // Check if verified (optional)
    // if (!account.isVerified) {
    //   throw new UnauthorizedException("Email chưa được xác thực")
    // }

    // Get profile
    const profile = await this.profileModel
      .findOne({ accountId: account._id })
      .lean()
      .exec()

    if (!profile) {
      throw new BadRequestException("Profile không tồn tại")
    }

    // Check profile status
    if (profile.status !== "active") {
      throw new UnauthorizedException(
        `Tài khoản đang ở trạng thái: ${profile.status}`
      )
    }

    // Update last login
    account.lastLoginAt = new Date()
    await account.save()

    // Generate JWT tokens
    const { accessToken, refreshToken, tokenExp, rtExp } =
      await this.generateTokens(
        account._id.toString(),
        profile._id.toString(),
        normalizedEmail
      )

    return {
      accessToken,
      refreshToken,
      tokenExp,
      rtExp,
      profile: {
        id: profile._id,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        status: profile.status
      }
    }
  }

  private async generateTokens(
    accountId: string,
    profileId: string,
    email: string
  ) {
    const jwtSecret = process.env.JWT_SECRET!
    const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret

    const accessTokenTtlSec = 60 * 60 * 24 // 24h
    const refreshTokenTtlSec = 30 * 24 * 60 * 60 // 30d

    const payload = {
      sub: accountId,
      profileId,
      email
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: accessTokenTtlSec
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshTokenTtlSec
    })

    // Save refresh session
    const tokenId = crypto.randomUUID()
    const hash = createHash("sha256").update(refreshToken).digest("hex")
    const expiresAt = new Date(Date.now() + refreshTokenTtlSec * 1000)

    await this.refreshSessionModel.create({
      userId: new Types.ObjectId(profileId), // Lưu profileId vào userId
      tokenId,
      hashedToken: hash,
      expiresAt
    })

    return {
      accessToken,
      refreshToken,
      tokenExp: accessTokenTtlSec,
      rtExp: refreshTokenTtlSec
    }
  }

  async refreshTokens(refreshTokenRaw: string) {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!

    if (!refreshTokenRaw) {
      throw new BadRequestException("Thiếu refresh token")
    }

    try {
      const decoded = this.jwtService.verify(refreshTokenRaw, {
        secret: refreshSecret
      }) as {
        sub: string
        profileId: string
        email: string
        iat: number
        exp: number
      }

      const hash = createHash("sha256").update(refreshTokenRaw).digest("hex")
      const session = await this.refreshSessionModel
        .findOne({
          userId: new Types.ObjectId(decoded.profileId),
          hashedToken: hash,
          revokedAt: null
        })
        .exec()

      if (!session) {
        throw new UnauthorizedException("Refresh token không hợp lệ")
      }

      if (session.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException("Refresh token đã hết hạn")
      }

      // Revoke old session
      session.revokedAt = new Date()
      await session.save()

      // Generate new tokens
      const { accessToken, refreshToken, tokenExp, rtExp } =
        await this.generateTokens(decoded.sub, decoded.profileId, decoded.email)

      return {
        accessToken,
        refreshToken,
        tokenExp,
        rtExp
      }
    } catch (e: any) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      ) {
        throw e
      }
      if (e?.name === "TokenExpiredError") {
        throw new UnauthorizedException("Refresh token đã hết hạn")
      }
      throw new UnauthorizedException("Refresh token không hợp lệ")
    }
  }

  async logout(refreshTokenRaw: string) {
    if (!refreshTokenRaw) {
      throw new BadRequestException("Thiếu refresh token")
    }

    const hash = createHash("sha256").update(refreshTokenRaw).digest("hex")
    const session = await this.refreshSessionModel
      .findOne({ hashedToken: hash, revokedAt: null })
      .exec()

    if (session) {
      session.revokedAt = new Date()
      await session.save()
    }

    return { success: true }
  }

  async validateAccessToken(
    accessToken: string
  ): Promise<{ valid: boolean; payload?: any; error?: string }> {
    if (!accessToken) {
      return { valid: false, error: "Thiếu access token" }
    }

    try {
      const payload = this.jwtService.verify(accessToken, {
        secret: process.env.JWT_SECRET!
      })
      return { valid: true, payload }
    } catch (e: any) {
      if (e?.name === "TokenExpiredError") {
        return { valid: false, error: "Access token đã hết hạn" }
      }
      return { valid: false, error: "Access token không hợp lệ" }
    }
  }

  async changePassword(
    accountId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const account = await this.accountModel.findById(accountId).exec()
    if (!account) {
      throw new BadRequestException("Account không tồn tại")
    }

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      account.passwordHash
    )
    if (!isPasswordValid) {
      throw new UnauthorizedException("Mật khẩu cũ không đúng")
    }

    const saltRounds = 10
    account.passwordHash = await bcrypt.hash(newPassword, saltRounds)
    await account.save()

    return { message: "Đổi mật khẩu thành công" }
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const account = await this.accountModel
      .findOne({ email: normalizedEmail })
      .exec()

    if (!account) {
      // Không tiết lộ thông tin account có tồn tại hay không
      return { message: "Nếu email tồn tại, link reset password đã được gửi" }
    }

    const resetToken = randomBytes(32).toString("hex")
    account.resetPasswordToken = resetToken
    account.resetPasswordExpires = new Date(Date.now() + 3600000) // 1 hour
    await account.save()

    // Send reset email
    try {
      await this.mailService.sendResetPasswordEmail(account.email, resetToken)
    } catch (err) {
      this.log.error("Failed to send reset email", err)
    }

    return { message: "Nếu email tồn tại, link reset password đã được gửi" }
  }

  async resetPassword(token: string, newPassword: string) {
    const account = await this.accountModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      })
      .exec()

    if (!account) {
      throw new BadRequestException("Token không hợp lệ hoặc đã hết hạn")
    }

    const saltRounds = 10
    account.passwordHash = await bcrypt.hash(newPassword, saltRounds)
    account.resetPasswordToken = null
    account.resetPasswordExpires = null
    await account.save()

    return { message: "Reset mật khẩu thành công" }
  }
}
