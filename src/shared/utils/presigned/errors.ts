export const PRESIGNED_UPLOAD_ERROR_CODES = {
  FILE_NOT_FOUND_ON_CLOUD: "FILE_NOT_FOUND_ON_CLOUD",
  FILE_REJECTED: "FILE_REJECTED",
  UPLOAD_EXPIRED: "UPLOAD_EXPIRED",
  PURPOSE_NOT_ALLOWED: "PURPOSE_NOT_ALLOWED",
  PUBLIC_ID_MISMATCH: "PUBLIC_ID_MISMATCH",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  CLOUDINARY_SIGNATURE_INVALID: "CLOUDINARY_SIGNATURE_INVALID",
  CLOUDINARY_UPLOAD_FAILED: "CLOUDINARY_UPLOAD_FAILED",
  PRESIGNED_URL_INVALID: "PRESIGNED_URL_INVALID",
  UPLOAD_CANCELLED: "UPLOAD_CANCELLED",
  UNKNOWN: "UPLOAD_UNKNOWN",
} as const

export type PresignedUploadErrorCode =
  | (typeof PRESIGNED_UPLOAD_ERROR_CODES)[keyof typeof PRESIGNED_UPLOAD_ERROR_CODES]
  | string

export class PresignedUploadError extends Error {
  readonly code: PresignedUploadErrorCode
  readonly status?: number
  readonly retryable: boolean

  constructor(code: PresignedUploadErrorCode, options?: { status?: number; retryable?: boolean; cause?: unknown }) {
    super(code, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = "PresignedUploadError"
    this.code = code
    this.status = options?.status
    this.retryable = options?.retryable ?? false
  }
}

export function isPresignedUploadError(error: unknown): error is PresignedUploadError {
  return error instanceof PresignedUploadError
}
