import type { ComponentProps } from "react"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { STATUS_BADGE_TONES, type StatusBadgeTone } from "@/shared/components/ui/status-badge-tones"

/**
 * The status pill used by every list table (shape of the transport request status): small, fully rounded, with a dot.
 * Pick a colour with `tone` (see status-badge-tones.ts), or pass `className` when a feature keeps its own colour classes.
 */
interface StatusBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant"> {
  /** Picks one of the shared colours. Pass `className` instead when a feature keeps its own colour classes. */
  tone?: StatusBadgeTone
  /** The leading dot. Turn it off for tags that are not a status. */
  dot?: boolean
}

export function StatusBadge({ tone, dot = true, className, children, ...props }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none",
        tone && STATUS_BADGE_TONES[tone],
        className,
      )}
      {...props}
    >
      {dot ? <Circle className="size-1! fill-current" aria-hidden="true" /> : null}
      {children}
    </Badge>
  )
}
