export const PRESIGNED_UPLOAD_ENTITIES = ["attachment", "avatar"] as const

export type PresignedUploadEntity = (typeof PRESIGNED_UPLOAD_ENTITIES)[number]

export interface PresignedUploadRequest {
  entity: PresignedUploadEntity
  contentType: string
  sizeBytes: number
}

export type PresignedUploadParams = Record<string, string>

export interface PresignedUploadResponse {
  publicId: string
  upload: {
    url: string
    params: PresignedUploadParams
  }
}

export type PresignedUploadStage = "signing" | "uploading" | "confirming" | "completed"

export interface PresignedUploadProgress {
  stage: PresignedUploadStage
  percent: number
}

export interface UploadFileOptions {
  file: File
  entity: PresignedUploadEntity
  signal?: AbortSignal
  onProgress?: (progress: PresignedUploadProgress) => void
}
