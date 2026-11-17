import { AlertCircle, X } from "lucide-react"

export interface UploadLimitNoticeProps {
  title?: string
  message?: string
  onDismiss?: () => void
  className?: string
}

/**
 * Designed limit notice for SINGLE-file upload areas.
 * Replaces plain red text with a styled status banner when users attempt
 * to add multiple files or add a second file when one already exists.
 */
export function UploadLimitNotice({
  title = "Only one file allowed",
  message = "Only one file is allowed here. Remove the current file to upload another.",
  onDismiss,
  className = "",
}: UploadLimitNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-2 flex items-start gap-2.5 rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-xs ${className}`}
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-amber-700"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-amber-800">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss limit notice"
          className="shrink-0 rounded-[2px] p-0.5 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-amber-600"
          onClick={onDismiss}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

