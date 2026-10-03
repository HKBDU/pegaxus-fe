import { PRESIGNED_UPLOAD_ERROR_CODES } from '@/shared/utils/presigned'

export const DEFAULT_UPLOAD_ERRORS: Record<string, string> = {
  [PRESIGNED_UPLOAD_ERROR_CODES.FILE_REJECTED]: 'The server rejected this file.',
  [PRESIGNED_UPLOAD_ERROR_CODES.FILE_NOT_FOUND_ON_CLOUD]: 'File not found after upload. Try again.',
  [PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_EXPIRED]: 'The upload session expired. Try again.',
  [PRESIGNED_UPLOAD_ERROR_CODES.PURPOSE_NOT_ALLOWED]: 'You are not allowed to upload this kind of file.',
  [PRESIGNED_UPLOAD_ERROR_CODES.TOO_MANY_REQUESTS]: 'Too many requests. Wait a moment and try again.',
  [PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_SIGNATURE_INVALID]: 'Invalid upload signature. Try again.',
  [PRESIGNED_UPLOAD_ERROR_CODES.CLOUDINARY_UPLOAD_FAILED]: 'Upload failed. Check your connection and try again.',
  [PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN]: 'Something went wrong. Try again.',
}

export const UPLOAD_STAGE_LABELS: Record<string, string> = {
  signing: 'Preparing',
  uploading: 'Uploading',
  confirming: 'Confirming',
  completed: 'Done',
}
