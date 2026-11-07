import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { priceListSortOptions, type PriceListSortBy } from "../list.schemas"

interface Props {
  search: string
  isActive?: boolean
  sortBy: PriceListSortBy
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: PriceListSortBy) => void
}

export function PriceListFilters({ search, isActive, sortBy, onSearchChange, onStatusChange, onSortChange }: Props) {
  const sortLabels: Record<PriceListSortBy, string> = {
    "createdAt:desc": "Newest first",
    "createdAt:asc": "Oldest first",
    "updatedAt:desc": "Recently updated",
    "updatedAt:asc": "Least recently updated",
    "name:asc": "Name (A–Z)",
    "name:desc": "Name (Z–A)",
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-white p-4 md:flex-row md:items-center">
      <Input className="md:max-w-sm" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by name…" aria-label="Search price lists" />
      <Select value={isActive === undefined ? "all" : String(isActive)} onValueChange={onStatusChange}>
        <SelectTrigger className="md:w-36"><SelectValue placeholder="Status: All" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Status: All</SelectItem><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as PriceListSortBy)}>
        <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>{priceListSortOptions.map((option) => <SelectItem key={option} value={option}>{sortLabels[option]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}
