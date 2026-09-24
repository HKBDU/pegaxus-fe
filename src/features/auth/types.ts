export type Role = string
export type Permission = string

export interface AuthPrincipal {
  id: string
  email?: string
  displayName?: string
  roles: Role[]
  permissions: Permission[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface AuthUser {
  accountId: string
  accountType: 'CUSTOMER' | 'EMPLOYEE'
  role:
    | 'CUSTOMER'
    | 'LOGISTICS_MANAGER'
    | 'TRANSPORT_SPECIALIST'
    | 'FLEET_ROUTE_COORDINATOR'
    | 'DRIVER'
    | 'ESCORT'
  customerId: string | null
  employeeId: string | null
  fullName: string
  avatarUrl: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResendOtpRequest {
  email: string
  purpose: 'PASSWORD_RESET'
}

export interface ResetPasswordRequest {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface RegisterResponse {
  accountId: string
  customerId: string
}

export interface AuthApiError {
  errorCode: string
  message: string
  errors: { field: string; message: string }[] | null
}

export interface JwtPayload {
  sub: string
  email?: string
  name?: string
  role?: Role
  roles?: Role[]
  permissions?: Permission[]
}
