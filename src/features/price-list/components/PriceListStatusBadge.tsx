import { StatusBadge } from "@/shared/components/ui/status-badge"

export function PriceListStatusBadge({ isActive }: { isActive: boolean }) {
  return <StatusBadge tone={isActive ? "emerald" : "slate"}>{isActive ? "Active" : "Inactive"}</StatusBadge>
}
