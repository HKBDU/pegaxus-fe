import { useState } from "react"
import { toast } from "sonner"

import { PriceListTable } from "@/features/price-list/components/PriceListTable"
import { usePriceListListPage } from "@/features/price-list/hooks/usePriceListListPage"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

/** UC-78 step 1: the price lists. Filters, paging and navigation live in `usePriceListListPage`. */
export default function PriceListListPage() {
  const page = usePriceListListPage()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader title="Price Lists" backHref="/admin" showBack={false} />
          <p className="text-xs text-slate-500 sm:text-sm">Manage the price lists that quotations and invoices are built from.</p>
        </div>

        {page.isError ? (
          <ErrorState message={page.errorMessage} onRetry={page.retry} />
        ) : (
          <PriceListTable
            items={page.items}
            meta={page.meta}
            isLoading={page.isLoading}
            isFiltered={page.isFiltered}
            search={page.search}
            isActive={page.isActive}
            sortBy={page.sortBy}
            onSearchChange={page.setSearch}
            onStatusChange={page.setStatus}
            onSortChange={page.setSort}
            onPageChange={page.setPage}
            onPageSizeChange={page.setPageSize}
            onCreate={() => setIsCreateOpen(true)}
            onView={page.view}
            // Placeholders until the real Clone and Activate dialogs are merged in.
            onClone={(item) => toast.info(`Clone integration pending for “${item.name}”`)}
            onActivate={(item) => toast.info(`Activate integration pending for “${item.name}”`)}
          />
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create price list</DialogTitle>
            <DialogDescription>Price list form integration is pending. The create dialog is ready for PriceListFormDialog.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
