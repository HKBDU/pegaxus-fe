import type { PaginationMeta } from '@/shared/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = meta

  if (totalPages <= 1) return null

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
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1 ${className ?? ''}`}>
      <button
        type="button"
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
        className="rounded-md border p-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-4" />
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
            className={`min-w-9 rounded-md border px-3 py-2 ${
              currentPage === page ? 'bg-primary text-primary-foreground' : ''
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
        className="rounded-md border p-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}
