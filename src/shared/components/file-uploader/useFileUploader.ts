import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PRESIGNED_UPLOAD_ERROR_CODES,
  isPresignedUploadError,
  presignedUpload,
} from '@/shared/utils/presigned'
import { DEFAULT_UPLOAD_ERRORS } from './constants'
import { createUploadId, describeFileRejection, formatFileSize, matchesAcceptedType } from './utils'
import type { FileRejection, FileUploaderProps, FileUploaderSnapshot, UploadItem } from './types'

type UploadOptions = Pick<
  FileUploaderProps,
  'entity' | 'accept' | 'maxSize' | 'maxFiles' | 'multiple' | 'disabled' |
  'concurrency' | 'onUploaded' | 'onChange' | 'onStateChange' | 'onError' | 'onReject' | 'errorMessages'
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
  onStateChange,
  onError,
  onReject,
  errorMessages,
}: UploadOptions) {
  const [items, setItems] = useState<UploadItem[]>([])
  // Submit must see selection changes synchronously, before React effects run.
  const itemsRef = useRef<UploadItem[]>([])
  const revision = useRef(0)
  const selectionLocked = useRef(false)
  const active = useRef(true)
  const [rejections, setRejections] = useState<string[]>([])
  const started = useRef(new Set<string>())
  const controllers = useRef(new Map<string, AbortController>())
  const progressTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const callbacks = useRef({ onUploaded, onChange, onStateChange, onError, onReject })
  callbacks.current = { onUploaded, onChange, onStateChange, onError, onReject }

  const getSnapshot = useCallback((): FileUploaderSnapshot => ({
    revision: revision.current,
    items: itemsRef.current.map((item) => ({ ...item, progress: { ...item.progress } })),
  }), [])

  const publishItems = useCallback((next: UploadItem[], notify = true) => {
    itemsRef.current = next
    revision.current += 1
    setItems(next)
    if (notify) callbacks.current.onStateChange?.(getSnapshot())
  }, [getSnapshot])

  const lockCompletedSelection = useCallback((expectedRevision: number) => {
    if (!active.current || selectionLocked.current || revision.current !== expectedRevision ||
      !itemsRef.current.length || itemsRef.current.some((item) => item.status !== 'success' || !item.publicId?.trim())) return false
    selectionLocked.current = true
    return true
  }, [])

  const patchItem = useCallback((id: string, next: Partial<UploadItem>) => {
    if (!active.current || !itemsRef.current.some((item) => item.id === id)) return
    publishItems(itemsRef.current.map((item) => item.id === id ? { ...item, ...next } : item),
      next.status !== undefined || next.publicId !== undefined)
  }, [publishItems])

  const remove = useCallback((id: string) => {
    if (!active.current || selectionLocked.current) return
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    const timer = progressTimers.current.get(id)
    if (timer) clearTimeout(timer)
    progressTimers.current.delete(id)
    started.current.delete(id)
    publishItems(itemsRef.current.filter((item) => item.id !== id))
  }, [publishItems])

  const uploadItem = useCallback(async (item: UploadItem) => {
    if (!active.current || selectionLocked.current || !itemsRef.current.some((entry) => entry.id === item.id && entry.status === 'queued')) return
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    patchItem(item.id, { status: 'uploading', errorCode: undefined, errorMessage: undefined })

    try {
      const publicId = await presignedUpload.upload({
        file: item.file,
        entity,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted && controllers.current.get(item.id) === controller) patchItem(item.id, { progress })
        },
      })
      if (!active.current || controller.signal.aborted || controllers.current.get(item.id) !== controller || !itemsRef.current.some((entry) => entry.id === item.id)) return
      patchItem(item.id, { status: 'success', publicId, progress: { stage: 'completed', percent: 100 }, progressVisible: true })
      const timer = setTimeout(() => {
        patchItem(item.id, { progressVisible: false })
        progressTimers.current.delete(item.id)
      }, 5000)
      progressTimers.current.set(item.id, timer)
      callbacks.current.onUploaded?.({ publicId, file: item.file })
    } catch (error) {
      if (!active.current || controller.signal.aborted || controllers.current.get(item.id) !== controller) return
      const code = isPresignedUploadError(error) ? error.code : PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN
      if (code === PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED) return
      const message = errorMessages?.[code] ?? DEFAULT_UPLOAD_ERRORS[code] ?? DEFAULT_UPLOAD_ERRORS[PRESIGNED_UPLOAD_ERROR_CODES.UNKNOWN]
      patchItem(item.id, { status: 'error', errorCode: code, errorMessage: message })
      callbacks.current.onError?.({ file: item.file, code })
    } finally {
      if (controllers.current.get(item.id) === controller) controllers.current.delete(item.id)
    }
  }, [entity, errorMessages, patchItem])

  useEffect(() => {
    active.current = true
    const activeControllers = controllers.current
    const activeProgressTimers = progressTimers.current
    callbacks.current.onStateChange?.(getSnapshot())
    return () => {
      active.current = false
      activeControllers.forEach((controller) => controller.abort())
      activeProgressTimers.forEach((timer) => clearTimeout(timer))
    }
  }, [getSnapshot])

  useEffect(() => {
    let slots = Math.max(1, concurrency) - itemsRef.current.filter((item) => item.status === 'uploading').length
    for (const item of itemsRef.current) {
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

  const addFiles = useCallback((incoming: File[]) => {
    if (!active.current || selectionLocked.current || disabled || incoming.length === 0) return
    const rejected: FileRejection[] = []
    const accepted: File[] = []
    const pool = multiple ? incoming : incoming.slice(0, 1)
    let room = multiple && maxFiles ? maxFiles - itemsRef.current.length : Infinity

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
      publishItems(created)
    } else {
      publishItems([...itemsRef.current, ...created])
    }
  }, [accept, disabled, maxFiles, maxSize, multiple, publishItems])

  const retry = useCallback((id: string) => {
    if (!active.current || selectionLocked.current || !itemsRef.current.some((item) => item.id === id && item.status === 'error')) return
    started.current.delete(id)
    const timer = progressTimers.current.get(id)
    if (timer) clearTimeout(timer)
    progressTimers.current.delete(id)
    patchItem(id, { status: 'queued', progress: { stage: 'signing', percent: 0 }, progressVisible: true })
  }, [patchItem])

  return { items, rejections, addFiles, remove, retry, getSnapshot, lockCompletedSelection }
}
