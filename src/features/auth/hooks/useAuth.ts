import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/features/auth/services'
import { useAuthStore } from '@/features/auth/store'
import type {
  AuthApiError,
  AuthPrincipal,
  AuthResponse,
  JwtPayload,
  LoginRequest,
  RegisterRequest,
} from '@/features/auth/types'
import { queryClient } from '@/lib/queryClient'

function getPrincipal(response: AuthResponse): AuthPrincipal {
  if (response.principal) return response.principal

  const payload = jwtDecode<JwtPayload>(response.accessToken)
  const roles = payload.roles ?? (payload.role ? [payload.role] : [])

  return {
    id: payload.sub,
    email: payload.email,
    displayName: payload.name,
    roles,
    permissions: payload.permissions ?? [],
  }
}

export function useRegisterMutation() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (_, variables) => {
      toast.success('Sign up successful. Please check your email for the verification code.')
      navigate('/verify-email', { replace: true, state: { email: variables.email } })
    },
    onError: (error) => {
      const message = isAxiosError<AuthApiError>(error)
        ? error.response?.data?.message
        : undefined
      toast.error(message ?? 'Failed to sign up. Please try again.')
    },
  })
}

export function useLoginMutation() {
  const location = useLocation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (response) => {
      setAuth({
        accessToken: response.accessToken,
        principal: getPrincipal(response),
      })
      toast.success('Login successful')
      navigate(from, { replace: true })
    },
    onError: () => toast.error('Login failed. Please try again.'),
  })
}

export function useLogoutMutation() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}

export function useUser() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken),
  })
}
