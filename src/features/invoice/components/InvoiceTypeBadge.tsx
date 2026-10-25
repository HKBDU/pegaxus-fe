import { cn } from "@/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { INVOICE_TYPE_COLORS, INVOICE_TYPE_LABELS, type InvoiceType } from "@/features/invoice/constants"

export function InvoiceTypeBadge({ type, className }: { type: InvoiceType; className?: string }) {
  return <Badge className={cn(INVOICE_TYPE_COLORS[type], className)}>{INVOICE_TYPE_LABELS[type]}</Badge>
}
