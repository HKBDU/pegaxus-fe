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
}

export interface JwtPayload {
  sub: string
  email?: string
  name?: string
  role?: Role
  roles?: Role[]
  permissions?: Permission[]
}
