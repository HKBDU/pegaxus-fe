import { cn } from "@/lib/utils"
import { getTypeMeta } from "@/features/notification/utils"

export function NotificationTypeIcon({ type, className }: { type: string; className?: string }) {
  const { icon: Icon, tone, label } = getTypeMeta(type)
  return (
    <span title={label} className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", tone, className)}>
      <Icon aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
