import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import type { PriceListItem } from "@/features/price-list/types"
import { filterPriceListItems, type PriceListTierFilter, type PriceListTypeFilter } from "@/features/price-list/utils"

interface UsePriceListItemsTableOptions {
  items: PriceListItem[]
  columns: ColumnDef<PriceListItem>[]
}

/**
 * State of the lines table: search, tier and type filters, sorting, selected rows and visible columns.
 * Everything happens on the client because the detail already carries every line.
 * No sort is set at first, so the lines show in the order the BE sent.
 */
export function usePriceListItemsTable({ items, columns }: UsePriceListItemsTableOptions) {
  const [search, setSearch] = useState("")
  const [tier, setTier] = useState<PriceListTierFilter>("ALL")
  const [type, setType] = useState<PriceListTypeFilter>("ALL")
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const rows = useMemo(() => filterPriceListItems(items, { search, tier, type }), [items, search, tier, type])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => row.priceListItemId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return {
    table,
    search,
    setSearch,
    tier,
    setTier,
    type,
    setType,
    isFiltered: Boolean(search.trim()) || tier !== "ALL" || type !== "ALL",
  }
}
