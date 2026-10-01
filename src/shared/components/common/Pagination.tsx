import { cn } from '@/lib/utils'
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination'
import type { PaginationMeta } from '@/shared/types'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  className?: string
}

const controlClass =
  'h-7 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] text-slate-900 shadow-none hover:border-amber-500 hover:bg-amber-50 disabled:opacity-50'

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 3) return Array.from({ length: totalPages }, (_, index) => index + 1)

  // Sliding window of 3 pages around the current one, plus first/last page, with "..." next to them whenever there are more than 3 pages.
  const windowStart = Math.min(Math.max(1, currentPage - 1), totalPages - 2)
  const windowEnd = windowStart + 2
  const pages: (number | '...')[] = []

  if (windowStart > 1) pages.push(1)
  if (windowStart > 1) pages.push('...')
  for (let page = windowStart; page <= windowEnd; page += 1) pages.push(page)
  if (windowEnd < totalPages) pages.push('...')
  if (windowEnd < totalPages) pages.push(totalPages)
  return pages
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, meta.totalPages)
  const currentPage = Math.min(Math.max(1, meta.currentPage), totalPages)

  return (
    <PaginationRoot className={cn('mx-0 w-auto justify-center', className)}>
      <PaginationContent className="flex-wrap justify-center gap-1">
        <PaginationItem>
          <PaginationPrevious
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={cn(controlClass, 'gap-1 sm:pl-2')}
          />
        </PaginationItem>

        {getPageNumbers(currentPage, totalPages).map((page, index) => (
          <PaginationItem key={page === '...' ? `ellipsis-${index}` : page}>
            {page === '...' ? (
              <PaginationEllipsis className="size-7" />
            ) : (
              <PaginationLink
                isActive={currentPage === page}
                onClick={() => onPageChange(page)}
                className={cn(
                  controlClass,
                  'min-w-7 px-1.5',
                  currentPage === page &&
                    'border-amber-500 bg-primary shadow-[0_6px_16px_rgba(239,143,0,0.2)] hover:bg-primary',
                )}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={cn(controlClass, 'gap-1 sm:pr-2')}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}
