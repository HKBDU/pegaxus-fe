import { isAxiosError } from "axios"
import { UPLOAD_MAX_MB } from "@/shared/constants/upload"

type ApiError = {
  code?: number
  errorCode?: string
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

export function getHorseApiErrorMessage(error: unknown, fallback = "The horse request failed. Please try again.") {
  if (!isAxiosError<ApiError>(error)) return fallback

  const status = error.response?.status
  const data = error.response?.data
  const errorCode = String(data?.errorCode ?? "").toUpperCase()

  if (status === 400 || errorCode === "VALIDATION_ERROR") {
    const validationMessage = data?.errors?.map((item) => item.message).filter(Boolean).join(" ")
    return validationMessage || data?.message || "Please check the horse information and try again."
  }

  if (status === 401 || errorCode === "UNAUTHORIZED") return "Your session has expired. Please sign in again."
  if (status === 403 || errorCode === "FORBIDDEN") return "You do not have permission to manage this horse."
  if (status === 404 || errorCode === "NOT_FOUND") return "This horse could not be found. It may have already been removed."
  if (errorCode === "HORSE_IN_APPROVED_BOOKING") return "This horse belongs to an approved booking and cannot be deleted."
  if (status === 409 || errorCode === "CONFLICT") return "A horse with the same name or microchip number already exists."
  if (["INVALID_PUBLIC_ID", "INVALID_FILE_TYPE", "INVALID_FILE", "UPLOAD_NOT_FOUND", "FILE_TOO_LARGE"].includes(errorCode)) return data?.message || `The horse avatar could not be uploaded. Please choose a valid JPG or PNG image up to ${UPLOAD_MAX_MB} MiB.`
  if (status !== undefined && status >= 500) return "The server could not complete this horse request. Please try again later."

  return data?.message || fallback
}
