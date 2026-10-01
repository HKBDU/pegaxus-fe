import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { AlertCircle, CheckCircle2, FileIcon, RotateCw, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { UPLOAD_STAGE_LABELS } from './file-uploader/constants'
import { useFileUploader } from './file-uploader/useFileUploader'
import { formatFileSize } from './file-uploader/utils'
import type { FileUploaderProps } from './file-uploader/types'

export type { FileUploaderProps, UploadItem, UploadStatus } from './file-uploader/types'

export default function FileUploader({
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
  title = 'Drag and drop files here, or click to browse',
  hint,
  errorMessages,
  className,
}: FileUploaderProps) {
  const { items, rejections, addFiles, remove, retry } = useFileUploader({
    entity, accept, maxSize, maxFiles, multiple, disabled, concurrency,
    onUploaded, onChange, onError, onReject, errorMessages,
  })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

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
    <div className={cn('w-full', className)}>
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
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center outline-none transition-colors',
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
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const inProgress = item.status === 'queued' || item.status === 'uploading'
            return (
              <li key={item.id} className="rounded-md border bg-card px-3 py-2">
                <div className="flex items-center gap-3">
                  {item.status === 'success' ? <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-hidden /> : item.status === 'error' ? <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" title={item.file.name}>{item.file.name}</p>
                    <p className={cn('text-xs text-muted-foreground', item.status === 'error' && 'text-destructive')}>
                      {item.status === 'queued' && `${formatFileSize(item.file.size)} · Waiting`}
                      {item.status === 'uploading' && `${UPLOAD_STAGE_LABELS[item.progress.stage] ?? 'Working'} (${item.progress.percent}%)`}
                      {item.status === 'success' && `${formatFileSize(item.file.size)} · Uploaded`}
                      {item.status === 'error' && item.errorMessage}
                    </p>
                  </div>
                  {item.status === 'error' && <Button type="button" variant="ghost" size="sm" onClick={() => retry(item.id)} aria-label={`Retry ${item.file.name}`}><RotateCw className="size-4" aria-hidden />Retry</Button>}
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => remove(item.id)} aria-label={`${inProgress ? 'Cancel' : 'Remove'} ${item.file.name}`}><X className="size-4" aria-hidden /></Button>
                </div>
                {(item.status === 'uploading' || item.status === 'success') && <Progress value={item.progress.percent} className={cn('mt-2 h-1.5', item.status === 'success' && '[&>*]:bg-green-600')} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
