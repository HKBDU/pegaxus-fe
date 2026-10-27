import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/store'
import { env } from '@/lib/env'
import { requestRefreshToken } from '@/features/auth/services/refresh-token'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
  _authSessionVersion?: number
}

const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((request) => {
  const config = request as RetryableRequestConfig
  const { accessToken, sessionVersion } = useAuthStore.getState()

  if (config._retry && config._authSessionVersion !== sessionVersion) {
    throw new Error('Authentication session changed before retry')
  }
  config._authSessionVersion = sessionVersion

  if (accessToken && !accessToken.startsWith('demo-')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // Let the browser/Axios add the multipart boundary for profile uploads.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  return config
})

let refreshRequest: { sessionVersion: number; promise: Promise<string> } | null = null

async function refreshAccessToken(refreshToken: string, sessionVersion: number) {
  const tokens = await requestRefreshToken(apiClient, refreshToken)
  const state = useAuthStore.getState()
  if (state.sessionVersion !== sessionVersion || state.refreshToken !== refreshToken) {
    throw new Error('Authentication session changed during refresh')
  }
  state.setTokens(tokens)
  return tokens.accessToken
}

apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const isAuthRequest = /(?:^|\/)auth\//.test(originalRequest?.url ?? '')

    if (error.response?.status !== 401 || !originalRequest || isAuthRequest) {
      return Promise.reject(error)
    }

    const { accessToken, refreshToken, sessionVersion } = useAuthStore.getState()
    if (accessToken?.startsWith('demo-')) {
      return Promise.reject(error)
    }
    if (originalRequest._authSessionVersion !== sessionVersion) return Promise.reject(error)

    if (originalRequest._retry || !accessToken || !refreshToken) {
      if (accessToken) useAuthStore.getState().clearAuth()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // A delayed 401 may belong to the token already replaced by another request.
    if (originalRequest.headers.get('Authorization') !== `Bearer ${accessToken}`) {
      originalRequest.headers.set('Authorization', `Bearer ${accessToken}`)
      return apiClient(originalRequest)
    }

    try {
      if (!refreshRequest || refreshRequest.sessionVersion !== sessionVersion) {
        const flight = {
          sessionVersion,
          promise: refreshAccessToken(refreshToken, sessionVersion),
        }
        refreshRequest = flight
        void flight.promise.finally(() => {
          if (refreshRequest === flight) refreshRequest = null
        }).catch(() => undefined)
      }

      const nextAccessToken = await refreshRequest.promise
      originalRequest.headers.set('Authorization', `Bearer ${nextAccessToken}`)
      return apiClient(originalRequest)
    } catch (refreshError) {
      if (useAuthStore.getState().sessionVersion === sessionVersion) {
        useAuthStore.getState().clearAuth()
      }
      return Promise.reject(refreshError)
    }
  },
)

export default apiClient
