import apiClient from '@/lib/axios'
import type {
  AuthPrincipal,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@/features/auth/types'

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post('/auth/login', credentials) as unknown as Promise<AuthResponse>
  },

  async register(credentials: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post('/auth/register', credentials) as unknown as Promise<AuthResponse>
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async getMe(): Promise<AuthPrincipal> {
    return apiClient.get('/user/me') as unknown as Promise<AuthPrincipal>
  },
}
