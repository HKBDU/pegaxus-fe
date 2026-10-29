import { formatLocalDateTimeLabel, formatUtcDateTime } from "@/shared/utils/datetime"

interface DateTimeUtcProps {
  value: string | Date | null | undefined
  compact?: boolean
  className?: string
}

export function DateTimeUtc({ value, compact = false, className }: DateTimeUtcProps) {
  const utc = formatUtcDateTime(value)
  const local = formatLocalDateTimeLabel(value)

  if (compact) {
    return <span className={className} title={local}>{utc}</span>
  }

  return (
    <span className={className}>
      <span className="block">{utc}</span>
      {utc !== "—" && <span className="block text-[0.7rem] text-slate-400">{local}</span>}
    </span>
  )
}

