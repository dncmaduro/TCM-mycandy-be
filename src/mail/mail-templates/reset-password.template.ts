export const renderResetPasswordEmail = (params: {
  name?: string
  link: string
}) => {
  const { name = "", link } = params
  const displayName = name ? `Hi ${name},` : `Hello,`
  const styles = {
    body: `margin:0;padding:0;background:#f4f6f8;font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`,
    container: `max-width:680px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 30px rgba(16,24,40,0.08);`,
    header: `padding:28px 32px;background:linear-gradient(90deg,#4f46e5,#06b6d4);color:#ffffff;text-align:left;`,
    logo: `font-weight:700;font-size:20px;letter-spacing:0.2px;`,
    content: `padding:32px;color:#0f172a;line-height:1.6;`,
    buttonWrap: `text-align:center;margin:28px 0;`,
    button: `display:inline-block;padding:12px 22px;border-radius:10px;background:#111827;color:#fff;text-decoration:none;font-weight:600;`,
    footer: `padding:20px 32px;font-size:13px;color:#64748b;background:#f8fafc;text-align:left;`
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Reset your password</title>
    </head>
    <body style="${styles.body}">
      <div style="${styles.container}">
        <div style="${styles.header}">
          <div style="${styles.logo}">MyCandy</div>
        </div>
        <div style="${styles.content}">
          <p style="margin:0 0 16px 0;font-size:16px;color:#0f172a">${displayName}</p>
          <p style="margin:0 0 12px 0;color:#334155">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để đặt lại mật khẩu. Liên kết sẽ hết hạn sau 1 giờ.</p>

          <div style="${styles.buttonWrap}">
            <a href="${link}" style="${styles.button}" target="_blank" rel="noopener">Đặt lại mật khẩu</a>
          </div>

          <p style="margin:0 0 12px 0;color:#475569">Nếu nút không hoạt động, hãy sao chép đường dẫn dưới đây vào trình duyệt:</p>
          <p style="word-break:break-all;font-size:13px;color:#0f172a;margin:0 0 16px 0">${link}</p>

          <p style="margin:0;color:#64748b">Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này. Tài khoản của bạn an toàn.</p>

          <hr style="border:none;border-top:1px solid #eef2ff;margin:24px 0" />

          <p style="margin:0;color:#94a3b8;font-size:13px">Cảm ơn,<br/>Đội ngũ MyCandy</p>
        </div>
        <div style="${styles.footer}">
          <div>MyCandy Inc.</div>
          <div style="margin-top:6px;color:#94a3b8">If you didn't request this, you can safely ignore this email.</div>
        </div>
      </div>
    </body>
  </html>`

  const text = `${displayName}\n\nWe received a request to reset your password. Open the link below to reset it (expires in 1 hour):\n\n${link}\n\nIf you didn't request this, ignore this email.`

  return { html, text }
}
