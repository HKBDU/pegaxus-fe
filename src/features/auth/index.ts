export { AccessBoundary } from './components/AccessBoundary'
export { authApi } from './services'
export { useAuthStore } from './store'
export { canAccess } from './access-control'
export {
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUser,
} from './hooks/useAuth'
export type {
  AuthPrincipal,
  AuthResponse,
  JwtPayload,
  LoginRequest,
  Permission,
  RegisterRequest,
  Role,
} from './types'
export type { AccessPolicy } from './access-control'
