import { useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageFrame } from "../components/PageFrame"
import { StartForm } from "../components/StartForm"
import { handoverPaths, type HandoverAudience } from "../constants"
import { useCreateHandover, useTransportSegments } from "../hooks/useHandovers"
import { HandoverApiError } from "../services"
import type { CreateHandoverInput } from "../types"
import { describeError } from "../utils"

/** Start step (HO3). The form itself is `StartForm`; this page loads OT4, calls HO3 and moves on to the new record. */
export default function HandoverStartPage({ audience }: { audience: HandoverAudience }) {
  const { transportId = "", bookingId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const segments = useTransportSegments(transportId)
  const create = useCreateHandover(transportId)

  const legs = useMemo(() => new Map((segments.data?.segments ?? []).map((segment) => [segment.routePlanRouteId, segment])), [segments.data])
  const back = handoverPaths.list(audience, transportId, bookingId)
  const recordHref = (id: string) => handoverPaths.record(audience, transportId, id, bookingId)

  const submit = async (input: CreateHandoverInput) => {
    try {
      const record = await create.mutateAsync(input)
      toast.success(input.startNow ? "Handover started." : "Handover scheduled.")
      navigate(recordHref(record.handoverRecordId), { replace: true })
    } catch (error) {
      if (error instanceof HandoverApiError && error.errorCode === "HANDOVER_ALREADY_EXISTS" && typeof error.value?.handoverRecordId === "string") {
        toast.info("This handover point already has a record. Opening it.")
        navigate(recordHref(error.value.handoverRecordId), { replace: true })
        return
      }
      throw error
    }
  }

  const boundaries = segments.data?.handoverBoundaries ?? []

  return (
    <PageFrame audience={audience} title="Start handover" backHref={back} backLabel="Return to handover records">
      {segments.isPending ? (
        <LoadingState />
      ) : segments.isError ? (
        <ErrorState message={describeError(segments.error, "The handover points could not be loaded.")} onRetry={() => void segments.refetch()} />
      ) : boundaries.length === 0 ? (
        <ErrorState message="This transport has no handover points yet." />
      ) : (
        <StartForm
          audience={audience}
          boundaries={boundaries}
          legs={legs}
          preset={{ from: search.get("fromRoutePlanRouteId"), to: search.get("toRoutePlanRouteId"), type: search.get("handoverType") }}
          pending={create.isPending}
          backHref={back}
          recordHref={recordHref}
          onSubmit={submit}
        />
      )}
    </PageFrame>
  )
}
