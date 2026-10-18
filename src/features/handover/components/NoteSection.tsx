import { useId } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/shared/components/ui/textarea"

interface Props {
  title: string
  placeholder: string
  value: string
  onChange?: (value: string) => void
  /** Read-only view of a completed or cancelled record. */
  readOnly?: boolean
  required?: boolean
  maxLength?: number
  error?: string
  name: string
}

/** One note block of the design: a peach title bar over a text area. */
export function NoteSection({ title, placeholder, value, onChange, readOnly = false, required = false, maxLength = 2000, error, name }: Props) {
  const id = useId()
  return (
    <div data-field={name} className={cn("border-b border-slate-300 last:border-b-0", error && "bg-red-50/40")}>
      <label htmlFor={id} className="flex items-center justify-between gap-2 bg-[#fde9d0] px-3 py-2 font-heading text-xs font-semibold tracking-[0.06em] text-gray-900 uppercase sm:px-4">
        <span>
          {title}
          {required && !readOnly ? <span className="text-red-600" aria-hidden="true"> *</span> : null}
        </span>
        {!readOnly && onChange ? <span className="text-[0.6875rem] font-medium text-gray-500 normal-case">{value.length}/{maxLength}</span> : null}
      </label>
      {readOnly || !onChange ? (
        <p id={id} className="min-h-16 px-3 py-3 text-sm whitespace-pre-wrap text-gray-800 sm:px-4">
          {value.trim() ? value : <span className="text-gray-400">No notes.</span>}
        </p>
      ) : (
        <Textarea
          id={id}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-required={required}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-24 resize-y rounded-none border-0 bg-white px-3 py-3 text-base shadow-none focus-visible:ring-inset focus-visible:ring-primary/30 sm:min-h-20 sm:px-4 sm:text-sm"
        />
      )}
      {error ? <p role="alert" className="px-3 pb-2 text-xs text-red-600 sm:px-4">{error}</p> : null}
    </div>
  )
}
