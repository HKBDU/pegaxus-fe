import { Badge } from "@/shared/components/ui/badge"
import { INVOICE_TYPE_COLORS, INVOICE_TYPE_LABELS, type InvoiceType } from "@/features/invoice/constants"

export function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  return <Badge className={INVOICE_TYPE_COLORS[type]}>{INVOICE_TYPE_LABELS[type]}</Badge>
}
