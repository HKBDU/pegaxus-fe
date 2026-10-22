import { lazy, Suspense } from "react"
import { ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/shared/components/ui/skeleton"

import type { IncidentLike } from "../types"
import { coordinates, EMPTY, formatDateTime, mapsUrl, roleLabel } from "../utils"
import { InfoRow, Panel, TextBlock } from "./ui"

const IncidentLocationMap = lazy(() => import("./IncidentLocationMap"))

interface OverviewProps {
  incident: IncidentLike
  /** Link of the transport code; the Customer and crew views have no admin transport page to go to. */
  transportHref?: string
}

/** Incident Overview block of SCR-F5-002 / 003. The phone number only exists in the staff response. */
export function IncidentOverview({ incident, transportHref }: OverviewProps) {
  const { reportedBy, transport } = incident
  const phone = "phone" in reportedBy ? reportedBy.phone : null
  return (
    <Panel title="Incident overview">
      <dl className="m-0 grid gap-x-8 gap-y-1.5 md:grid-cols-2">
        <InfoRow label="Transport">
          {transport ? (
            transportHref ? (
              <Link to={transportHref} className="font-medium text-amber-700 underline-offset-2 hover:underline">{transport.transportCode}</Link>
            ) : (
              transport.transportCode
            )
          ) : (
            EMPTY
          )}
        </InfoRow>
        <InfoRow label="Booking">{transport?.bookingCode}</InfoRow>
        <InfoRow label="Title">{incident.title}</InfoRow>
        <InfoRow label="Reported by">
          {reportedBy.fullName} <span className="text-gray-500">({roleLabel(reportedBy.role)})</span>
          {phone ? <span className="block text-gray-500">{phone}</span> : null}
        </InfoRow>
        <InfoRow label="Occurred at">{formatDateTime(incident.occurredAt)}</InfoRow>
        <InfoRow label="Reported at">{formatDateTime(incident.reportedAt)}</InfoRow>
        <div className="grid gap-2 md:col-span-2">
          <TextBlock label="Immediate action">{incident.immediateAction}</TextBlock>
          <TextBlock label="Description">{incident.description}</TextBlock>
        </div>
      </dl>
    </Panel>
  )
}

/** Result of a closed incident (resolution or cancellation), shown above the overview. */
export function IncidentOutcome({ incident }: { incident: IncidentLike }) {
  if (incident.status === "RESOLVED") {
    return (
      <Panel title="Resolution" className="border-emerald-200 bg-emerald-50/40">
        <dl className="m-0 grid gap-1.5">
          <InfoRow label="Resolved at">{formatDateTime(incident.resolvedAt)}</InfoRow>
          <TextBlock label="Resolution summary">{incident.resolutionSummary}</TextBlock>
        </dl>
      </Panel>
    )
  }
  if (incident.status === "CANCELLED") {
    return (
      <Panel title="Cancellation" className="border-slate-300 bg-slate-50">
        <dl className="m-0 grid gap-1.5">
          <InfoRow label="Cancelled at">{formatDateTime(incident.cancelledAt)}</InfoRow>
          <TextBlock label="Reason">{incident.cancellationReason}</TextBlock>
        </dl>
      </Panel>
    )
  }
  return null
}

export function IncidentLocation({ incident }: { incident: IncidentLike }) {
  const { location } = incident
  const url = mapsUrl(location)
  return (
    <Panel
      title="Location"
      action={
        url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline-offset-2 hover:underline">
            Open in Maps
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : undefined
      }
    >
      {location ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <dl className="m-0 grid content-start gap-1.5">
            <InfoRow label="Place">{location.locationName}</InfoRow>
            <InfoRow label="City">{location.city}</InfoRow>
            <InfoRow label="Country">{location.country}</InfoRow>
            <InfoRow label="GPS">{coordinates(location)}</InfoRow>
          </dl>
          <Suspense fallback={<Skeleton className="h-[240px] w-full rounded-none bg-slate-100" />}>
            <IncidentLocationMap location={location} />
          </Suspense>
        </div>
      ) : (
        <p className="m-0 text-xs text-gray-500">No location was recorded for this incident.</p>
      )}
    </Panel>
  )
}
