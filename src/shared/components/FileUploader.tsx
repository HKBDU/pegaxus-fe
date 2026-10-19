import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { AlertCircle, CheckCircle2, FileIcon, RotateCw, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { UPLOAD_STAGE_LABELS } from './file-uploader/constants'
import { useFileUploader } from './file-uploader/useFileUploader'
import { formatFileSize } from './file-uploader/utils'
import type { FileUploaderProps } from './file-uploader/types'

export type { FileUploaderHandle, FileUploaderSnapshot, FileUploaderProps, UploadItem, UploadStatus } from './file-uploader/types'

export default function FileUploader({
  ref,
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
  title = 'Drag and drop files here, or click to browse',
  hint,
  errorMessages,
  className,
}: FileUploaderProps) {
  const { items, rejections, addFiles, remove, retry, getSnapshot, lockCompletedSelection } = useFileUploader({
    entity, accept, maxSize, maxFiles, multiple, disabled, concurrency,
    onUploaded, onChange, onStateChange, onError, onReject, errorMessages,
  })
  useImperativeHandle(ref, () => ({ getSnapshot, lockCompletedSelection }), [getSnapshot, lockCompletedSelection])
  const [dragging, setDragging] = useState(false)
  const [hiddenProgressIds, setHiddenProgressIds] = useState<Set<string>>(new Set())
  const [collapsingIds, setCollapsingIds] = useState<Set<string>>(new Set())
  const hideTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const collapseTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    items.filter((item) => item.status === 'success').forEach((item) => {
      if (hiddenProgressIds.has(item.id) || collapsingIds.has(item.id) || hideTimers.current.has(item.id)) return
      hideTimers.current.set(item.id, setTimeout(() => {
        setCollapsingIds((current) => new Set(current).add(item.id))
        hideTimers.current.delete(item.id)
        const collapseTimer = setTimeout(() => {
          setHiddenProgressIds((current) => new Set(current).add(item.id))
          setCollapsingIds((current) => {
            const next = new Set(current)
            next.delete(item.id)
            return next
          })
          collapseTimers.current.delete(item.id)
        }, 300)
        collapseTimers.current.set(item.id, collapseTimer)
      }, 5000))
    })
  }, [collapsingIds, hiddenProgressIds, items])

  useEffect(() => () => {
    hideTimers.current.forEach((timer) => clearTimeout(timer))
    collapseTimers.current.forEach((timer) => clearTimeout(timer))
  }, [])

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault()
    if (!disabled) {
      dragDepth.current += 1
      setDragging(true)
    }
  }

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const shownHint = hint ?? [
    accept ? `Accepted: ${accept}` : null,
    maxSize ? `Up to ${formatFileSize(maxSize)} per file` : null,
    multiple && maxFiles ? `Up to ${maxFiles} files` : null,
  ].filter(Boolean).join('. ')

  return (
    <div className={cn('min-w-0 w-full max-w-full overflow-hidden', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex min-w-0 max-w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed px-6 py-10 text-center outline-none transition-colors',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          disabled ? 'cursor-not-allowed opacity-50' : dragging ? 'cursor-copy border-primary bg-primary/5' : 'cursor-pointer border-border hover:bg-muted/50',
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{dragging ? 'Drop files to upload' : title}</p>
        {shownHint && <p className="text-xs text-muted-foreground">{shownHint}</p>}
        <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple} disabled={disabled} onChange={onInputChange} />
      </div>

      {rejections.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-destructive" role="alert">
          {rejections.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="mt-4 min-w-0 max-w-full space-y-2 overflow-hidden">
          {items.map((item) => {
            const inProgress = item.status === 'queued' || item.status === 'uploading'
            if (item.status === 'success' && hiddenProgressIds.has(item.id)) return null
            return (
                  <li key={item.id} className={cn('min-w-0 max-w-full overflow-hidden rounded-md border bg-card px-3 py-2 transition-[max-height,opacity,transform,padding] duration-300 ease-out', collapsingIds.has(item.id) ? 'max-h-0 -translate-y-1 border-transparent px-0 py-0 opacity-0' : 'max-h-40')}>
                <div className="flex items-center gap-3">
                  {item.status === 'success' ? <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-hidden /> : item.status === 'error' ? <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  <div className="w-0 min-w-0 max-w-full flex-1 overflow-hidden">
                    {!(item.status === 'success' && hiddenProgressIds.has(item.id)) && <p className="max-w-full truncate text-sm" title={item.file.name}>{item.file.name}</p>}
                    <p className={cn('text-xs text-muted-foreground', item.status === 'error' && 'text-destructive')}>
                      {item.status === 'queued' && `${formatFileSize(item.file.size)} · Waiting`}
                      {item.status === 'uploading' && `${UPLOAD_STAGE_LABELS[item.progress.stage] ?? 'Working'} (${item.progress.percent}%)`}
                      {item.status === 'success' && `${formatFileSize(item.file.size)} · Uploaded`}
                      {item.status === 'error' && item.errorMessage}
                    </p>
                  </div>
                  {item.status === 'error' && <Button type="button" variant="ghost" size="sm" onClick={() => { const timer = collapseTimers.current.get(item.id); if (timer) clearTimeout(timer); collapseTimers.current.delete(item.id); setCollapsingIds((current) => { const next = new Set(current); next.delete(item.id); return next }); setHiddenProgressIds((current) => { const next = new Set(current); next.delete(item.id); return next }); retry(item.id) }} aria-label={`Retry ${item.file.name}`}><RotateCw className="size-4" aria-hidden />Retry</Button>}
                  <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => { const timer = collapseTimers.current.get(item.id); if (timer) clearTimeout(timer); collapseTimers.current.delete(item.id); setCollapsingIds((current) => { const next = new Set(current); next.delete(item.id); return next }); setHiddenProgressIds((current) => { const next = new Set(current); next.delete(item.id); return next }); remove(item.id) }} aria-label={`${inProgress ? 'Cancel' : 'Remove'} ${item.file.name}`}><X className="size-4" aria-hidden /></Button>
                </div>
                {(item.status === 'uploading' || (item.status === 'success' && item.progressVisible !== false && !hiddenProgressIds.has(item.id))) && <Progress value={item.progress.percent} className={cn('mt-2 h-1.5 max-w-full', item.status === 'success' && '[&>*]:bg-green-600')} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
