import { Badge } from "@/shared/components/ui/badge"
import { RECEIPT_STATUS_COLORS, RECEIPT_STATUS_LABELS, type ReceiptStatus } from "@/features/invoice/constants"

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return <Badge className={RECEIPT_STATUS_COLORS[status]}>{RECEIPT_STATUS_LABELS[status]}</Badge>
}
