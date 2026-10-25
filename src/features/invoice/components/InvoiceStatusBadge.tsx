import { cn } from "@/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/features/invoice/constants"

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return <Badge className={cn(INVOICE_STATUS_COLORS[status], className)}>{INVOICE_STATUS_LABELS[status]}</Badge>
}
