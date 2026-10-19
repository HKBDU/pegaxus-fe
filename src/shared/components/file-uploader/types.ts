import type { PresignedUploadEntity, PresignedUploadProgress } from '@/shared/utils/presigned'
import type { Ref } from 'react'

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'error'

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  progress: PresignedUploadProgress
  progressVisible?: boolean
  publicId?: string
  errorCode?: string
  errorMessage?: string
}

export interface FileUploaderSnapshot {
  readonly revision: number
  readonly items: readonly Readonly<UploadItem>[]
}

export interface FileUploaderHandle {
  getSnapshot: () => FileUploaderSnapshot
  /** Freezes a completed selection until this uploader is unmounted. */
  lockCompletedSelection: (revision: number) => boolean
}

export interface FileUploaderProps {
  ref?: Ref<FileUploaderHandle>
  entity?: PresignedUploadEntity
  accept?: string
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  concurrency?: number
  onUploaded?: (result: { publicId: string; file: File }) => void
  onChange?: (publicIds: string[]) => void
  /** Reports the remaining selection on add, status changes, retry and removal. */
  onStateChange?: (snapshot: FileUploaderSnapshot) => void
  onError?: (error: { file: File; code: string }) => void
  onReject?: (rejections: { file: File; reason: string }[]) => void
  title?: string
  hint?: string
  errorMessages?: Record<string, string>
  className?: string
}

export type FileRejection = { file: File; reason: string }
