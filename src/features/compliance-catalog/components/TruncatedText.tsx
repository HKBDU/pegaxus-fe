import { useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"

/** One line of text that keeps its column width; the full text shows in a tooltip only when it was cut off. */
export function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={(next) => setOpen(next && Boolean(ref.current) && ref.current!.scrollWidth > ref.current!.clientWidth)}>
        <TooltipTrigger asChild>
          <span ref={ref} className={cn("block truncate py-1", className)}>{text}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm break-words">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
