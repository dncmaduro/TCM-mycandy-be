import { Injectable, Logger } from "@nestjs/common"
import * as nodemailer from "nodemailer"
import { renderResetPasswordEmail } from "./mail-templates/reset-password.template"

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name)
  private transporter: nodemailer.Transporter

  constructor() {
    const host = process.env.GMAIL_HOST
    const port = Number(process.env.GMAIL_PORT) || 587
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_PASS

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass
      }
    })
  }

  async sendResetPasswordEmail(
    email: string,
    tokenOrLink: string,
    name?: string
  ) {
    try {
      const frontend = process.env.FRONTEND_RESET_PASSWORD_URL || ""
      const link = frontend ? `${frontend}?token=${tokenOrLink}` : tokenOrLink

      const { html, text } = renderResetPasswordEmail({ name, link })

      const info = await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Đặt lại mật khẩu — MyCandy",
        text,
        html
      })

      this.log.log(`Reset email sent to ${email}, messageId=${info.messageId}`)
      return info
    } catch (error) {
      this.log.error("Failed to send reset password email", error)
      throw error
    }
  }
}
