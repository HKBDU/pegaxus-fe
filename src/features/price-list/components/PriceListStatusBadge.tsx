import { Badge } from "@/shared/components/ui/badge"

export function PriceListStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
}
