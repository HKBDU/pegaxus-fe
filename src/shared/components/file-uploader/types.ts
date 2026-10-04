import type { PresignedUploadEntity, PresignedUploadProgress } from '@/shared/utils/presigned'

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'error'

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  progress: PresignedUploadProgress
  publicId?: string
  errorCode?: string
  errorMessage?: string
}

export interface FileUploaderProps {
  entity?: PresignedUploadEntity
  accept?: string
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  concurrency?: number
  onUploaded?: (result: { publicId: string; file: File }) => void
  onChange?: (publicIds: string[]) => void
  onError?: (error: { file: File; code: string }) => void
  onReject?: (rejections: { file: File; reason: string }[]) => void
  title?: string
  hint?: string
  errorMessages?: Record<string, string>
  className?: string
}

export type FileRejection = { file: File; reason: string }
