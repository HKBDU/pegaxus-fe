import { INVOICE_TYPE_LABELS, INVOICE_TYPE_TONES, type InvoiceType } from "@/features/invoice/constants"
import { StatusBadge } from "@/shared/components/ui/status-badge"

export function InvoiceTypeBadge({ type, className }: { type: InvoiceType; className?: string }) {
  // The type is a label, not a state, so it has no status dot.
  return <StatusBadge tone={INVOICE_TYPE_TONES[type]} dot={false} className={className}>{INVOICE_TYPE_LABELS[type]}</StatusBadge>
}
