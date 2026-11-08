import {
  ActivatePriceListDialog,
  ClonePriceListButton,
  PriceListFormDialog,
} from "@/features/price-list/components/ExternalPlaceholders"
import { DeletePriceListItemDialog } from "@/features/price-list/components/DeletePriceListItemDialog"
import { PriceListHeaderCard } from "@/features/price-list/components/PriceListHeaderCard"
import { PriceListItemFormDialog } from "@/features/price-list/components/PriceListItemFormDialog"
import { PriceListItemsTable } from "@/features/price-list/components/PriceListItemsTable"
import { PriceListLockedBanner } from "@/features/price-list/components/PriceListLockedBanner"
import { PriceListNotFound } from "@/features/price-list/components/PriceListNotFound"
import { outlineButtonClass, panelClass, primaryButtonClass } from "@/features/price-list/components/PriceListPrimitives"
import { PriceListTierCoverage } from "@/features/price-list/components/PriceListTierCoverage"
import { usePriceListDetailPage } from "@/features/price-list/hooks/usePriceListDetailPage"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"

/** UC-78 / UC-79 "PriceList Detail": header, lock banner, tier coverage and the lines. State and rules live in `usePriceListDetailPage`. */
export default function PriceListDetailPage() {
  const page = usePriceListDetailPage()
  const { priceList } = page

  const clone = priceList ? (
    <ClonePriceListButton
      priceList={{ priceListId: priceList.priceListId, name: priceList.name }}
      onCloned={(copy) => page.goToPriceList(copy.priceListId)}
    />
  ) : null

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3">
          <PageHeader title="PRICE LIST DETAILS" backHref={page.backHref} backLabel="BACK TO PRICE LISTS" />
        </div>

        {page.isLoading ? <Skeleton className="h-64 w-full rounded-none bg-white" /> : null}
        {page.notFound ? <PriceListNotFound listHref={page.listPath} /> : null}
        {page.isError ? <ErrorState message={page.errorMessage} onRetry={page.retry} /> : null}

        {priceList ? (
          <div className="booking-stagger space-y-2.5">
            <PriceListHeaderCard
              priceList={priceList}
              actions={
                <>
                  {page.canEdit ? (
                    <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => page.setEditHeaderOpen(true)}>Edit</Button>
                  ) : null}
                  {clone}
                  {page.canEdit ? (
                    <Button type="button" className={primaryButtonClass} onClick={() => page.setActivateOpen(true)}>Activate</Button>
                  ) : null}
                </>
              }
            />

            {page.isActive ? (
              <PriceListLockedBanner action={clone} />
            ) : (
              <div className={cn(panelClass, "px-4 py-3")}>
                <PriceListTierCoverage items={priceList.items} />
              </div>
            )}

            <PriceListItemsTable
              items={priceList.items}
              currency={priceList.currency}
              isActive={priceList.isActive}
              onEdit={page.openItemForm}
              onDelete={page.askDelete}
              onAdd={() => page.openItemForm()}
            />
          </div>
        ) : null}
      </div>

      {priceList && page.canEdit ? (
        <>
          {/* `updatedAt` goes in untouched: the form sends it back as `lastUpdatedAt` (A-01). */}
          <PriceListFormDialog
            mode="edit"
            open={page.editHeaderOpen}
            onOpenChange={page.setEditHeaderOpen}
            priceList={priceList}
            onSaved={() => page.setEditHeaderOpen(false)}
          />
          <ActivatePriceListDialog
            priceList={priceList}
            open={page.activateOpen}
            onOpenChange={page.setActivateOpen}
            onActivated={() => page.setActivateOpen(false)}
          />
        </>
      ) : null}

      {priceList ? (
        <PriceListItemFormDialog
          key={page.itemForm.session}
          priceListId={priceList.priceListId}
          currency={priceList.currency}
          item={page.itemForm.item}
          open={page.itemForm.open}
          onOpenChange={page.setItemFormOpen}
        />
      ) : null}

      {priceList && page.deleteTarget ? (
        <DeletePriceListItemDialog
          priceListId={priceList.priceListId}
          item={page.deleteTarget}
          open
          onOpenChange={(open) => { if (!open) page.closeDelete() }}
          onDeleted={page.closeDelete}
        />
      ) : null}
    </div>
  )
}
