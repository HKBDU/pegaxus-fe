import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES, type InvoiceStatus } from "@/features/invoice/constants"
import { StatusBadge } from "@/shared/components/ui/status-badge"

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return <StatusBadge tone={INVOICE_STATUS_TONES[status]} className={className}>{INVOICE_STATUS_LABELS[status]}</StatusBadge>
}
