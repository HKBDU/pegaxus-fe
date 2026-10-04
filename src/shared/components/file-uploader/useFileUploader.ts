import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PRESIGNED_UPLOAD_ERROR_CODES,
  isPresignedUploadError,
  presignedUpload,
} from '@/shared/utils/presigned'
import { DEFAULT_UPLOAD_ERRORS } from './constants'
import { createUploadId, describeFileRejection, formatFileSize, matchesAcceptedType } from './utils'
import type { FileRejection, FileUploaderProps, UploadItem } from './types'

type UploadOptions = Pick<
  FileUploaderProps,
  'entity' | 'accept' | 'maxSize' | 'maxFiles' | 'multiple' | 'disabled' |
  'concurrency' | 'onUploaded' | 'onChange' | 'onError' | 'onReject' | 'errorMessages'
>

export function useFileUploader({
  entity = 'attachment',
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled = false,
  concurrency = 3,
  onUploaded,
  onChange,
  onError,
  onReject,
  errorMessages,
}: UploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [rejections, setRejections] = useState<string[]>([])
  const started = useRef(new Set<string>())
  const controllers = useRef(new Map<string, AbortController>())
  const callbacks = useRef({ onUploaded, onChange, onError, onReject })
  callbacks.current = { onUploaded, onChange, onError, onReject }

  const patchItem = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...next } : item))
  }, [])

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    started.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const uploadItem = useCallback(async (item: UploadItem) => {
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    patchItem(item.id, { status: 'uploading', errorCode: undefined, errorMessage: undefined })

    try {
      const publicId = await presignedUpload.upload({
        file: item.file,
        entity,
        signal: controller.signal,
        onProgress: (progress) => patchItem(item.id, { progress }),
      })
      patchItem(item.id, { status: 'success', publicId, progress: { stage: 'completed', percent: 100 } })
      callbacks.current.onUploaded?.({ publicId, file: item.file })
    } catch (error) {
      const code = isPresignedUploadError(error) ? error.code : PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN
      if (code === PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED) return
      const message = errorMessages?.[code] ?? DEFAULT_UPLOAD_ERRORS[code] ?? DEFAULT_UPLOAD_ERRORS[PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN]
      patchItem(item.id, { status: 'error', errorCode: code, errorMessage: message })
      callbacks.current.onError?.({ file: item.file, code })
    } finally {
      controllers.current.delete(item.id)
    }
  }, [entity, errorMessages, patchItem])

  useEffect(() => {
    let slots = Math.max(1, concurrency) - items.filter((item) => item.status === 'uploading').length
    for (const item of items) {
      if (slots <= 0) break
      if (item.status === 'queued' && !started.current.has(item.id)) {
        started.current.add(item.id)
        slots -= 1
        void uploadItem(item)
      }
    }
  }, [concurrency, items, uploadItem])

  const successIds = useMemo(
    () => items.flatMap((item) => item.status === 'success' && item.publicId ? [item.publicId] : []),
    [items],
  )
  const successKey = successIds.join('|')
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    callbacks.current.onChange?.(successIds)
    // The key intentionally tracks only successful IDs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successKey])

  useEffect(() => () => controllers.current.forEach((controller) => controller.abort()), [])

  const addFiles = useCallback((incoming: File[]) => {
    if (disabled || incoming.length === 0) return
    const rejected: FileRejection[] = []
    const accepted: File[] = []
    const pool = multiple ? incoming : incoming.slice(0, 1)
    let room = multiple && maxFiles ? maxFiles - items.length : Infinity

    for (const file of pool) {
      if (!matchesAcceptedType(file, accept)) rejected.push(describeFileRejection(file, 'file type is not supported.'))
      else if (maxSize && file.size > maxSize) rejected.push(describeFileRejection(file, `exceeds ${formatFileSize(maxSize)}.`))
      else if (room <= 0) rejected.push(describeFileRejection(file, `limit of ${maxFiles} files reached.`))
      else {
        accepted.push(file)
        room -= 1
      }
    }

    setRejections(rejected.map(({ reason }) => reason))
    if (rejected.length) callbacks.current.onReject?.(rejected)
    if (accepted.length === 0) return

    const created = accepted.map((file): UploadItem => ({
      id: createUploadId(),
      file,
      status: 'queued',
      progress: { stage: 'signing', percent: 0 },
    }))

    if (!multiple) {
      controllers.current.forEach((controller) => controller.abort())
      controllers.current.clear()
      started.current.clear()
      setItems(created)
    } else {
      setItems((current) => [...current, ...created])
    }
  }, [accept, disabled, items.length, maxFiles, maxSize, multiple])

  const retry = useCallback((id: string) => {
    started.current.delete(id)
    patchItem(id, { status: 'queued', progress: { stage: 'signing', percent: 0 } })
  }, [patchItem])

  return { items, rejections, addFiles, remove, retry }
}
