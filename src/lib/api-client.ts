import axios from "axios"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken")

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

export type ApiErrorDetail = { field: string; message: string }

export type ApiResponse<T> = {
  isSuccess: boolean
  code: number
  message: string
  value: T
  errorCode?: string
  errors?: ApiErrorDetail[] | null
}

