import type { PaginationMeta } from '@/shared/types'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  className?: string
  showSinglePage?: boolean
}

export function Pagination({ meta, onPageChange, className, showSinglePage = false }: PaginationProps) {
  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = meta

  if (totalPages === 0 || (totalPages === 1 && !showSinglePage)) return null

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')

    for (
      let page = Math.max(2, currentPage - 1);
      page <= Math.min(currentPage + 1, totalPages - 1);
      page += 1
    ) {
      pages.push(page)
    }

    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 text-slate-900 ${className ?? ''}`}>
      <button
        type="button"
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
        className="inline-flex h-7 items-center justify-center rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] transition-[transform,border-color,background-color] hover:-translate-y-px hover:border-amber-500 hover:bg-amber-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        Previous
      </button>

      {getPageNumbers().map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2" aria-hidden="true">
            ...
          </span>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-[2px] border px-1.5 text-[11px] transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-px hover:border-amber-500 active:translate-y-0 ${
              currentPage === page ? 'border-amber-500 bg-primary text-slate-900 shadow-[0_6px_16px_rgba(239,143,0,0.2)]' : 'border-slate-300 bg-white text-slate-900'
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
        className="inline-flex h-7 items-center justify-center rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] transition-[transform,border-color,background-color] hover:-translate-y-px hover:border-amber-500 hover:bg-amber-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        Next
      </button>
    </nav>
  )
}
