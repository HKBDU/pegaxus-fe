import { Plus } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { HandoverFilters } from "../components/HandoverFilters"
import { HandoverTable } from "../components/HandoverTable"
import { PageFrame } from "../components/PageFrame"
import { handoverPaths, type HandoverAudience } from "../constants"
import { useHandoverList } from "../hooks/useHandovers"
import type { HandoverListItem } from "../types"
import { describeError } from "../utils"

/** Handover records of one transport (HO1). Everyone who may see the transport sees the list; only staff and crew can create. */
export default function HandoverListPage({ audience }: { audience: HandoverAudience }) {
  const { transportId = "", bookingId } = useParams()
  const [search, setSearch] = useState("")
  const [handoverType, setHandoverType] = useState("ALL")
  const [status, setStatus] = useState("ALL")

  const query = useHandoverList(transportId, {
    handoverType: handoverType === "ALL" ? undefined : handoverType,
    status: status === "ALL" ? undefined : status,
  })

  const items = useMemo(() => {
    const term = search.trim().toLowerCase()
    const all = query.data?.items ?? []
    if (!term) return all
    return all.filter((item) => [item.handoverCode, item.fromPartyName, item.toPartyName, item.locationName].some((text) => text?.toLowerCase().includes(term)))
  }, [query.data, search])

  const hrefFor = useCallback(
    (item: HandoverListItem) => handoverPaths.record(audience, transportId, item.handoverRecordId, bookingId),
    [audience, transportId, bookingId],
  )

  const create =
    audience === "customer" ? null : (
      <Button asChild className="min-h-12 gap-2 rounded-[2px] font-heading font-semibold tracking-[0.06em] uppercase sm:min-h-9">
        <Link to={handoverPaths.start(audience, transportId, {})}>
          <Plus aria-hidden="true" className="size-4" />
          Create handover record
        </Link>
      </Button>
    )

  const hasFilters = search.trim() !== "" || handoverType !== "ALL" || status !== "ALL"

  return (
    <PageFrame audience={audience} title="Handover records" action={create}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={describeError(query.error, "Handover records could not be loaded.")} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <p role="status" className="px-0.5 font-heading text-[0.6875rem] font-medium tracking-[0.06em] text-gray-500 uppercase">
            {hasFilters ? `Showing ${items.length} of ${query.data.totalItems}` : `${query.data.totalItems}`} handover records
          </p>
          <HandoverTable
            items={items}
            isLoading={query.isFetching}
            hasFilters={hasFilters}
            hrefFor={hrefFor}
            filters={
              <HandoverFilters search={search} handoverType={handoverType} status={status} onSearchChange={setSearch} onTypeChange={setHandoverType} onStatusChange={setStatus} />
            }
          />
        </>
      )}
    </PageFrame>
  )
}
