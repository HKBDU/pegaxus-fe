import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/store'
import { env } from '@/lib/env'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Let the browser/Axios add the multipart boundary for profile uploads.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  return config
})

let refreshRequest: Promise<string> | null = null

async function refreshAccessToken() {
  const refreshToken = useAuthStore.getState().refreshToken

  if (!refreshToken) throw new Error('Refresh token is missing')

  const response = await axios.post(
    `${env.API_URL}auth/refresh-token`,
    { refreshToken },
    { withCredentials: true },
  )

  const accessToken: string | undefined =
    response.data?.data?.accessToken ?? response.data?.accessToken

  if (!accessToken) throw new Error('Refresh response does not contain an access token')

  useAuthStore.getState().setAccessToken(accessToken)
  const nextRefreshToken = response.data?.data?.refreshToken ?? response.data?.refreshToken
  if (nextRefreshToken) {
    useAuthStore.setState({ refreshToken: nextRefreshToken })
  }
  return accessToken
}

apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const isAuthRequest = originalRequest?.url?.includes('/auth/') ?? false

    if (error.response?.status !== 401 || !originalRequest || isAuthRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshRequest ??= refreshAccessToken().finally(() => {
        refreshRequest = null
      })

      const accessToken = await refreshRequest
      originalRequest.headers.set('Authorization', `Bearer ${accessToken}`)
      return apiClient(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(refreshError)
    }
  },
)

export default apiClient
