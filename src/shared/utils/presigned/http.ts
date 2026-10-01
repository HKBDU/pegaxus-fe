import apiClient from "@/lib/axios"
import { PRESIGNED_UPLOAD_ERROR_CODES, PresignedUploadError } from "./errors"
import type { PresignedUploadRequest, PresignedUploadResponse } from "./types"

const SIGNATURE_ENDPOINT = "/uploads/signature"
const CONFIRM_ENDPOINT = "/uploads/confirm"

function getErrorData(error: unknown): { code?: string; status?: number } {
  const response = (error as { response?: { status?: number; data?: unknown } }).response
  const data = response?.data
  if (!data || typeof data !== "object") return { status: response?.status }

  const value = data as Record<string, unknown>
  const nested = value.data && typeof value.data === "object" ? value.data as Record<string, unknown> : undefined
  const nestedError = value.error && typeof value.error === "object" ? value.error as Record<string, unknown> : undefined
  const code = value.code ?? value.errorCode ?? nested?.code ?? nested?.errorCode ?? nestedError?.code ?? nestedError?.errorCode
  return { code: typeof code === "string" ? code : undefined, status: response?.status }
}

function assertPresignedUploadResponse(value: PresignedUploadResponse): PresignedUploadResponse {
  if (
    !value ||
    typeof value.publicId !== "string" ||
    !value.publicId ||
    !value.upload ||
    typeof value.upload.url !== "string" ||
    !value.upload.params ||
    typeof value.upload.params !== "object"
  ) {
    throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.PRESIGNED_URL_INVALID)
  }
  return value
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const value = payload as Record<string, unknown>
    if ("value" in value) return value.value as T
    if ("data" in value && value.data && typeof value.data === "object") return value.data as T
  }
  return payload as T
}

export async function requestPresignedUpload(input: PresignedUploadRequest, signal?: AbortSignal): Promise<PresignedUploadResponse> {
  try {
    const payload = await apiClient.post(SIGNATURE_ENDPOINT, input, { signal }) as unknown
    return assertPresignedUploadResponse(unwrap<PresignedUploadResponse>(payload))
  } catch (error) {
    if (signal?.aborted) throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED)
    const { code, status } = getErrorData(error)
    throw new PresignedUploadError(code ?? PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN, { status, cause: error })
  }
}

export async function confirmPresignedUpload(publicId: string, signal?: AbortSignal): Promise<void> {
  try {
    await apiClient.post(CONFIRM_ENDPOINT, { publicId }, { signal })
  } catch (error) {
    if (signal?.aborted) throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED)
    const { code, status } = getErrorData(error)
    throw new PresignedUploadError(code ?? PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN, {
      status,
      retryable: isRetryableConfirmError(code, status),
      cause: error,
    })
  }
}

function isRetryableConfirmError(code: string | undefined, status: number | undefined) {
  if (code === PRESIGNED_UPLOAD_ERROR_CODES.FILE_NOT_FOUND_ON_CLOUD) return true
  if (code === PRESIGNED_UPLOAD_ERROR_CODES.TOO_MANY_REQUESTS) return false
  return !status || status >= 500
}
