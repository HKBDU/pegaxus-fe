import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_TONES, type ReceiptStatus } from "@/features/invoice/constants"
import { StatusBadge } from "@/shared/components/ui/status-badge"

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  return <StatusBadge tone={RECEIPT_STATUS_TONES[status]}>{RECEIPT_STATUS_LABELS[status]}</StatusBadge>
}
