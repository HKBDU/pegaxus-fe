import { Badge } from "@/shared/components/ui/badge"
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/features/invoice/constants"

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={INVOICE_STATUS_COLORS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>
}
