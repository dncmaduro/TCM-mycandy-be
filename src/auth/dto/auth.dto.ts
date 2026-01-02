export class RegisterDto {
  email: string
  password: string
  name?: string
}

export class LoginDto {
  email: string
  password: string
}

export class RefreshTokenDto {
  refreshToken: string
}

export class ChangePasswordDto {
  oldPassword: string
  newPassword: string
}

export class ForgotPasswordDto {
  email: string
}

export class ResetPasswordDto {
  token: string
  newPassword: string
}
