import { useState } from "react"

import { ActivatePriceListDialog } from "@/features/price-list/components/ActivatePriceListDialog"
import { ClonePriceListMenuItem } from "@/features/price-list/components/ClonePriceListMenuItem"
import { PriceListFormDialog } from "@/features/price-list/components/PriceListFormDialog"
import { PriceListTable } from "@/features/price-list/components/PriceListTable"
import { usePriceListListPage } from "@/features/price-list/hooks/usePriceListListPage"
import type { PriceListSummary } from "@/features/price-list/list.schemas"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

/** UC-78 step 1: the price lists. Filters, paging and navigation live in `usePriceListListPage`. */
export default function PriceListListPage() {
  const page = usePriceListListPage()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activateTarget, setActivateTarget] = useState<PriceListSummary>()

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
            renderClone={(item) => (
              <ClonePriceListMenuItem
                priceList={item}
                className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"
                onCloned={page.view}
              />
            )}
            onActivate={setActivateTarget}
          />
        )}
      </div>

      <PriceListFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSaved={(created) => {
          setIsCreateOpen(false)
          page.view(created)
        }}
      />

      {activateTarget ? (
        <ActivatePriceListDialog
          key={activateTarget.priceListId}
          priceList={activateTarget}
          open
          onOpenChange={(open) => { if (!open) setActivateTarget(undefined) }}
          onActivated={() => setActivateTarget(undefined)}
        />
      ) : null}
    </div>
  )
}
