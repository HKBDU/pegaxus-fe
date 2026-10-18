import { useId } from "react"
import { Input } from "@/shared/components/ui/input"

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  error?: string
  inputMode?: "text" | "tel"
  autoComplete?: string
}

/** Small labelled text input. 16px text on phones (no iOS zoom on focus), a comfortable tap height. */
export function DraftInput({ label, value, onChange, maxLength, error, inputMode = "text", autoComplete = "off" }: Props) {
  const id = useId()
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-[2px] border-slate-300 bg-white text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/20 sm:h-9 sm:text-sm"
      />
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
