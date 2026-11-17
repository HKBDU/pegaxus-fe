import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import "./BookingSummaryBar.css"

export interface BookingSummaryBarProps {
  bookingCode?: string | null
  originCountry?: string | null
  destinationCountry?: string | null
  selectedHorsesCount: number
  className?: string
}

function SummaryItem({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("booking-summary-cell", className)}>
      <dt className="font-heading text-[10px] font-medium uppercase leading-4 tracking-[0.1em] text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 flex min-h-5 min-w-0 items-center text-sm leading-5 font-semibold text-gray-900">
        {children}
      </dd>
    </div>
  )
}

export function BookingSummaryBar({
  bookingCode,
  originCountry,
  destinationCountry,
  selectedHorsesCount,
  className,
}: BookingSummaryBarProps) {
  const displayCode = bookingCode?.trim() || "Generated after submit"
  const displayOrigin = originCountry?.trim() || "—"
  const displayDestination = destinationCountry?.trim() || "—"

  return (
    <dl className={cn("booking-summary-bar", className)}>
      <SummaryItem label="Route" className="booking-summary-route">
        <span className="min-w-0 truncate" title={displayOrigin}>
          {displayOrigin}
        </span>
        <ArrowRight className="mx-1.5 size-3.5 shrink-0 text-gray-500" aria-hidden="true" />
        <span className="min-w-0 truncate" title={displayDestination}>
          {displayDestination}
        </span>
      </SummaryItem>

      <SummaryItem label="Booking code" className="booking-summary-code">
        <span className="min-w-0 truncate" title={displayCode}>
          {displayCode}
        </span>
      </SummaryItem>

      <SummaryItem label="Selected racehorses" className="booking-summary-horses">
        <span className="min-w-0 truncate">{selectedHorsesCount}</span>
      </SummaryItem>
    </dl>
  )
}

