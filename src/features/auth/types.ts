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
  principal?: AuthPrincipal
}

export interface LoginRequest {
  email: string
  password: string
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
