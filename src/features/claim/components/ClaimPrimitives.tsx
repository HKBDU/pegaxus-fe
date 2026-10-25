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

/** Same look as the Booking Details / Invoice pages: flat white panels with a thin warm border. */
export const panelClass = "border border-[#e5e2d9] bg-white"
export const fieldLabelClass = "mb-1 block font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500"
export const controlClass = "h-9 w-full rounded-none border-[#d8d5cb] bg-white px-3 text-sm shadow-none"
export const textareaClass = "min-h-[72px] w-full rounded-none border-[#d8d5cb] bg-white px-3 py-2 text-sm shadow-none"
export const outlineButtonClass =
  "h-9 rounded-none border-gray-900 bg-white px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-gray-900 hover:bg-gray-100"
export const primaryButtonClass =
  "h-9 rounded-none bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
export const dangerButtonClass =
  "h-9 rounded-none border-red-300 bg-white px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-red-700 hover:bg-red-50 hover:text-red-800"

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <Badge className={cn("rounded-[2px] uppercase", CLAIM_STATUS_COLORS[status])}>{CLAIM_STATUS_LABELS[status]}</Badge>
}

export function ClaimTypeBadge({ type }: { type: ClaimType }) {
  return (
    <Badge className="rounded-[2px] border-[#ef8f00]/60 bg-amber-50 font-heading text-[10px] font-bold uppercase tracking-[0.05em] text-[#a85f00]">
      <span aria-hidden="true" className="size-1.5 bg-[#ef8f00]" />
      {CLAIM_TYPE_LABELS[type]}
    </Badge>
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
      <dd className="mt-0.5 min-w-0 whitespace-pre-line break-words text-sm leading-5 text-gray-900">{children || "—"}</dd>
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
