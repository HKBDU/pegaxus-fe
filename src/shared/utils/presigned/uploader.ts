import { confirmPresignedUpload, requestPresignedUpload } from "./http"
import { PRESIGNED_UPLOAD_ERROR_CODES, PresignedUploadError } from "./errors"
import type {
  PresignedUploadEntity,
  PresignedUploadProgress,
  PresignedUploadResponse,
  UploadFileOptions,
} from "./types"

const CLOUDINARY_HOST = "api.cloudinary.com"
const PRESIGNED_CACHE_TTL_MS = 60_000
const CONFIRM_ATTEMPTS = 3
const CONFIRM_RETRY_DELAYS_MS = [500, 1_000]

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED)
  }
}

function notify(onProgress: UploadFileOptions["onProgress"], progress: PresignedUploadProgress) {
  onProgress?.(progress)
}

function validateCloudinaryUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" || parsed.hostname !== CLOUDINARY_HOST) throw new Error()
  } catch {
    throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.PRESIGNED_URL_INVALID)
  }
}

function isSignatureFailure(error: unknown) {
  return error instanceof PresignedUploadError && error.code === PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_SIGNATURE_INVALID
}

function cloudinaryErrorCode(body: unknown) {
  const message = body && typeof body === "object" && "error" in body
    ? (body.error as { message?: unknown })?.message
    : undefined
  return typeof message === "string" && /invalid signature|stale request/i.test(message)
    ? PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_SIGNATURE_INVALID
    : PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_UPLOAD_FAILED
}

async function uploadToCloudinary(
  presigned: PresignedUploadResponse,
  file: File,
  signal?: AbortSignal,
) {
  validateCloudinaryUrl(presigned.upload.url)
  throwIfAborted(signal)

  const formData = new FormData()
  for (const [key, value] of Object.entries(presigned.upload.params)) formData.append(key, value)
  formData.append("file", file)

  try {
    const response = await fetch(presigned.upload.url, {
      method: "POST",
      body: formData,
      credentials: "omit",
      signal,
    })
    if (!response.ok) {
      let body: unknown
      try { body = await response.json() } catch { body = undefined }
      throw new PresignedUploadError(cloudinaryErrorCode(body), { status: response.status })
    }
  } catch (error) {
    if (error instanceof PresignedUploadError) throw error
    if (signal?.aborted) throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED)
    throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_UPLOAD_FAILED, { cause: error })
  }
}

async function confirmWithRetry(publicId: string, signal?: AbortSignal) {
  let attempt = 0
  while (attempt < CONFIRM_ATTEMPTS) {
    throwIfAborted(signal)
    try {
      await confirmPresignedUpload(publicId, signal)
      return
    } catch (error) {
      attempt += 1
      if (!(error instanceof PresignedUploadError) || !error.retryable || attempt >= CONFIRM_ATTEMPTS) throw error
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, CONFIRM_RETRY_DELAYS_MS[attempt - 1] ?? 1_000)
        signal?.addEventListener("abort", () => {
          window.clearTimeout(timer)
          reject(new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED))
        }, { once: true })
      })
    }
  }
}

class PresignedUploadClient {
  private readonly cache = new WeakMap<File, Map<PresignedUploadEntity, { response: PresignedUploadResponse; expiresAt: number }>>()
  private readonly pending = new WeakMap<File, Map<PresignedUploadEntity, Promise<PresignedUploadResponse>>>()

  async get(file: File, entity: PresignedUploadEntity, signal?: AbortSignal) {
    throwIfAborted(signal)
    const cached = this.cache.get(file)?.get(entity)
    if (cached && cached.expiresAt > Date.now()) return cached.response
    if (cached) this.cache.get(file)?.delete(entity)

    let pendingForFile = this.pending.get(file)
    if (!pendingForFile) {
      pendingForFile = new Map()
      this.pending.set(file, pendingForFile)
    }
    const pending = pendingForFile.get(entity)
    if (pending) return pending

    const request = requestPresignedUpload({ entity, contentType: file.type, sizeBytes: file.size }, signal)
      .then((response) => {
        let cacheForFile = this.cache.get(file)
        if (!cacheForFile) {
          cacheForFile = new Map()
          this.cache.set(file, cacheForFile)
        }
        cacheForFile.set(entity, { response, expiresAt: Date.now() + PRESIGNED_CACHE_TTL_MS })
        return response
      })
      .finally(() => pendingForFile?.delete(entity))
    pendingForFile.set(entity, request)
    return request
  }

  async refresh(file: File, entity: PresignedUploadEntity, signal?: AbortSignal) {
    this.clear(file, entity)
    return this.get(file, entity, signal)
  }

  clear(file: File, entity?: PresignedUploadEntity) {
    if (entity) this.cache.get(file)?.delete(entity)
    else this.cache.delete(file)
  }

  async upload({ file, entity, signal, onProgress }: UploadFileOptions) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      notify(onProgress, { stage: "signing", percent: 0 })
      let presigned = await this.get(file, entity, signal)
      throwIfAborted(signal)

      notify(onProgress, { stage: "uploading", percent: 25 })
      try {
        await uploadToCloudinary(presigned, file, signal)
      } catch (error) {
        if (!isSignatureFailure(error)) throw error
        presigned = await this.refresh(file, entity, signal)
        await uploadToCloudinary(presigned, file, signal)
      }

      notify(onProgress, { stage: "confirming", percent: 75 })
      try {
        await confirmWithRetry(presigned.publicId, signal)
      } catch (error) {
        if (
          attempt === 0 &&
          error instanceof PresignedUploadError &&
          error.code === PRESIGNED_UPLOAD_ERROR_CODES.FILE_NOT_FOUND_ON_CLOUD
        ) {
          this.clear(file, entity)
          continue
        }
        throw error
      }

      this.clear(file, entity)
      notify(onProgress, { stage: "completed", percent: 100 })
      return presigned.publicId
    }

    throw new PresignedUploadError(PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN)
  }
}

export const presignedUpload = new PresignedUploadClient()
