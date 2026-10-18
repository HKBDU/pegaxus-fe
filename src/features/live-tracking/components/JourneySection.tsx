import { useState } from "react"
import { pickCurrentSegment } from "../lib/summary"
import type { SegmentDetail, TransportOverview } from "../types"
import { SegmentDetails } from "./SegmentDetails"
import { SegmentList } from "./SegmentList"

interface JourneySectionProps {
  overview: TransportOverview | undefined
  segments: SegmentDetail[]
  /** OT4 could not be read: the list shows what GP1 knows and says so. */
  detailsUnavailable: boolean
  onRetryDetails: () => void
}

/** Under the map: the legs of the journey as cards, and the details of the chosen one. */
export function JourneySection({ overview, segments, detailsUnavailable, onRetryDetails }: JourneySectionProps) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const selected = segments.find((item) => item.routePlanRouteId === pickedId) ?? pickCurrentSegment(segments)

  return (
    <div className="grid gap-4">
      {detailsUnavailable ? (
        <p role="status" className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Segment details (distance, crew, provider) are unavailable right now.
          <button type="button" className="font-semibold underline" onClick={onRetryDetails}>
            Retry
          </button>
        </p>
      ) : null}
      <SegmentList segments={segments} selectedId={selected?.routePlanRouteId} onSelect={setPickedId} />
      <SegmentDetails segment={selected} overview={overview} />
    </div>
  )
}
