import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException
} from "@nestjs/common"
import axios from "axios"
import { UsersService } from "src/users/users.service"
import { JwtService } from "@nestjs/jwt"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { RefreshSession } from "./refresh-token.schema"
import { createHash } from "node:crypto"

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name)
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel("RefreshSession")
    private readonly refreshSessionModel: Model<RefreshSession>
  ) {}

  async handleGoogleCallback(code: string): Promise<{ redirectUrl: string }> {
    const GET_TOKEN_URL = "https://oauth2.googleapis.com/token"

    // 1) Đổi code lấy token (FORM-ENCODED!)
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!, // phải trùng 100% với lúc authorize
      grant_type: "authorization_code"
    })

    let tokenResData: {
      access_token: string
      refresh_token?: string
      id_token: string
      expires_in: number
      scope: string
      token_type: string
    }

    try {
      const tokenRes = await axios.post(GET_TOKEN_URL, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })
      tokenResData = tokenRes.data
    } catch (err: any) {
      this.log.error(
        `Token exchange failed: ${err.response?.status} ${JSON.stringify(err.response?.data)}`
      )
      throw new BadRequestException("Đổi code lấy token thất bại")
    }

    const { access_token, refresh_token, id_token, expires_in, scope } =
      tokenResData

    // 2) Decode ID token (basic)
    const payload = JSON.parse(
      Buffer.from(id_token.split(".")[1], "base64").toString("utf8")
    ) as { sub: string; email: string; name?: string; picture?: string }

    const { sub, email, name, picture } = payload

    // 3) Upsert user + OAuth
    const upsertRes = await this.usersService.upsertGoogleUser({
      googleSub: sub,
      email,
      name,
      avatarUrl: picture,
      consentCalendar: scope?.includes(
        "https://www.googleapis.com/auth/calendar"
      ),
      tokens: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + (expires_in ?? 0) * 1000),
        scope
      }
    })

    // 🟩 4) Tạo JWT app (access + refresh)
    const jwtSecret = process.env.JWT_SECRET!
    const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret

    const accessTokenTtlSec = 15 * 60 // 15m
    const refreshTokenTtlSec = 30 * 24 * 60 * 60 // 30d

    const payloadApp = {
      sub: upsertRes.user._id.toString(),
      email: upsertRes.user.email
    }

    const accessToken = this.jwtService.sign(payloadApp, {
      secret: jwtSecret,
      expiresIn: accessTokenTtlSec
    })
    const refreshTokenApp = this.jwtService.sign(payloadApp, {
      secret: refreshSecret,
      expiresIn: refreshTokenTtlSec
    })

    // Lưu refresh session (hash)
    const tokenId = crypto.randomUUID()
    const hash = createHash("sha256").update(refreshTokenApp).digest("hex")
    const expiresAt = new Date(Date.now() + refreshTokenTtlSec * 1000)
    await this.refreshSessionModel.create({
      userId: upsertRes.user._id,
      tokenId,
      hashedToken: hash,
      expiresAt
    })

    // 🟩 5) Redirect kèm token (NOTE: query string chỉ tạm thời; nên chuyển sang HttpOnly cookie)
    const base = process.env.FRONTEND_CALLBACK_URL || "/"
    const redirectUrl = `${base}?token=${accessToken}&rt=${refreshTokenApp}&tokenExp=${accessTokenTtlSec}&rtExp=${refreshTokenTtlSec}`

    return { redirectUrl }
  }

  async refreshTokens(refreshTokenRaw: string) {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!
    if (!refreshTokenRaw) throw new BadRequestException("Thiếu refresh token")
    try {
      const decoded = this.jwtService.verify(refreshTokenRaw, {
        secret: refreshSecret
      }) as { sub: string; email: string; iat: number; exp: number }
      const hash = createHash("sha256").update(refreshTokenRaw).digest("hex")
      const session = await this.refreshSessionModel
        .findOne({ userId: decoded.sub, hashedToken: hash, revokedAt: null })
        .exec()
      if (!session)
        throw new UnauthorizedException("Refresh token không hợp lệ")
      if (session.expiresAt.getTime() < Date.now())
        throw new UnauthorizedException("Refresh token đã hết hạn")

      session.revokedAt = new Date()
      await session.save()

      const accessTokenTtlSec = 15 * 60
      const refreshTokenTtlSec = 30 * 24 * 60 * 60
      const payloadApp = { sub: decoded.sub, email: decoded.email }

      const newAccess = this.jwtService.sign(payloadApp, {
        secret: process.env.JWT_SECRET!,
        expiresIn: accessTokenTtlSec
      })
      const newRefresh = this.jwtService.sign(payloadApp, {
        secret: refreshSecret,
        expiresIn: refreshTokenTtlSec
      })

      const newHash = createHash("sha256").update(newRefresh).digest("hex")
      await this.refreshSessionModel.create({
        userId: session.userId,
        tokenId: crypto.randomUUID(),
        hashedToken: newHash,
        expiresAt: new Date(Date.now() + refreshTokenTtlSec * 1000)
      })

      return {
        accessToken: newAccess,
        refreshToken: newRefresh,
        tokenExp: accessTokenTtlSec,
        rtExp: refreshTokenTtlSec
      }
    } catch (e: any) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      )
        throw e
      if (e?.name === "TokenExpiredError")
        throw new UnauthorizedException("Refresh token đã hết hạn")
      throw new UnauthorizedException("Refresh token không hợp lệ")
    }
  }

  async logout(refreshTokenRaw: string) {
    if (!refreshTokenRaw) throw new BadRequestException("Thiếu refresh token")
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
}
