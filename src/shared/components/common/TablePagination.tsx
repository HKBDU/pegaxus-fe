import type { PaginationMeta } from '@/shared/types'
import { PageSizeSelect } from './PageSizeSelect'
import { Pagination } from './Pagination'

interface TablePaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeAriaLabel?: string
}

/** Shared table footer: "Showing x to y of z" + rows-per-page + page buttons. */
export function TablePagination({
  meta,
  onPageChange,
  onPageSizeChange,
  pageSizeAriaLabel,
}: TablePaginationProps) {
  const first = meta.totalItems === 0 ? 0 : (meta.currentPage - 1) * meta.itemsPerPage + 1
  const last = Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)

  return (
    <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p role="status">
        Showing {first} to {last} of {meta.totalItems} entries
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onPageSizeChange ? (
          <PageSizeSelect value={meta.itemsPerPage} ariaLabel={pageSizeAriaLabel} onValueChange={onPageSizeChange} />
        ) : null}
        <Pagination meta={meta} onPageChange={onPageChange} />
      </div>
    </div>
  )
}
