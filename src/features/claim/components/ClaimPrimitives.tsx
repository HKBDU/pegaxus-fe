import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  type ClaimStatus,
  type ClaimType,
} from "@/features/claim/constants"

/** Same look as the Booking Details / Transport Request pages: flat white panels with a thin warm border. */
export const panelClass = "border border-[#e5e2d9] bg-white"
export const fieldLabelClass = "mb-1 block font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.04em] text-[#181818]"
export const controlClass =
  "h-8 w-full rounded-[2px] border-[#f3aa3b] bg-transparent px-3 text-xs text-[#181818] shadow-none md:text-xs placeholder:text-[#6c6963] focus-visible:border-primary focus-visible:ring-primary/20"
export const textareaClass =
  "min-h-[72px] w-full rounded-[2px] border-[#f3aa3b] bg-transparent px-3 py-2 text-xs text-[#181818] shadow-none md:text-xs placeholder:text-[#6c6963] focus-visible:border-primary focus-visible:ring-primary/20"
const buttonBase =
  "h-8 rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors"
export const outlineButtonClass = `${buttonBase} border-gray-900 bg-white text-gray-900 hover:bg-gray-100`
export const primaryButtonClass = `${buttonBase} border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover`
export const dangerButtonClass = `${buttonBase} border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800`
export const columnHeadClass = "h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"

/** Pill badges like the Booking status badge: rounded, small, no uppercase. */
const pillClass = "inline-flex h-5 w-fit items-center gap-1 rounded-full px-2 py-0 text-[0.65rem] font-medium leading-none"

export function ClaimStatusBadge({ status, className }: { status: ClaimStatus; className?: string }) {
  return <Badge className={cn(pillClass, CLAIM_STATUS_COLORS[status], className)}>{CLAIM_STATUS_LABELS[status]}</Badge>
}

export function ClaimTypeBadge({ type, className }: { type: ClaimType; className?: string }) {
  return <Badge className={cn(pillClass, "border-amber-300 bg-amber-50 text-amber-800", className)}>{CLAIM_TYPE_LABELS[type]}</Badge>
}

/** Plain card heading used on the Booking Details page (no rule, no accent bar). */
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("m-0! font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! uppercase", className)}>{children}</h2>
}

/** One cell of the summary strip at the top of a detail page (same markup as Booking Details). */
export function SummaryCell({ label, first = false, children }: { label: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={cn("relative min-w-0 py-2.5", !first && "lg:pl-4 lg:before:absolute lg:before:inset-y-2.5 lg:before:left-0 lg:before:w-px lg:before:bg-gray-200")}>
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 flex min-h-5 items-center text-xs leading-5 text-gray-800">{children}</dd>
    </div>
  )
}

/** A titled flat block ("CLAIM INFO", "LINKED HANDOVER RECORD") with the small orange tab of the design. */
export function SectionTitle({ children, tone = "primary", className }: { children: ReactNode; tone?: "primary" | "danger" | "dark"; className?: string }) {
  const tab = tone === "danger" ? "bg-red-600" : tone === "dark" ? "bg-gray-900" : "bg-[#ef8f00]"
  return (
    <h2 className={cn("m-0! flex items-center gap-2 border-b border-[#e5e2d9] pb-2 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!", className)}>
      <span aria-hidden="true" className={cn("h-4 w-1", tab)} />
      {children}
    </h2>
  )
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 min-w-0 whitespace-pre-line break-words text-xs leading-5 text-gray-900">{children || "—"}</dd>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-[11px] text-red-600" role="alert">
      {message}
    </p>
  ) : null
}
