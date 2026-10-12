import { INVOICE_STATUS_CLASSES, INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/features/invoice/constants"
import type { InvoiceStatus, InvoiceType } from "@/features/invoice/types"
import { cn } from "@/lib/utils"

const badgeClass =
  "inline-flex h-6 items-center whitespace-nowrap rounded-[2px] border px-2 font-heading text-[11px] font-semibold uppercase tracking-[0.05em]"

// Kept inside this feature until the shared invoice badges (Flow 6, payment feature) are merged; swap the imports then.
export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return <span className={cn(badgeClass, INVOICE_STATUS_CLASSES[status], className)}>{INVOICE_STATUS_LABELS[status]}</span>
}

export function InvoiceTypeBadge({ type, className }: { type: InvoiceType; className?: string }) {
  return <span className={cn(badgeClass, "border-gray-300 bg-white text-gray-800", className)}>{INVOICE_TYPE_LABELS[type]}</span>
}
