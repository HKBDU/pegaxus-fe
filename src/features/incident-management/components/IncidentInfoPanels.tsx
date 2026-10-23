import { lazy, Suspense } from "react"
import { ClipboardList, ExternalLink, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/shared/components/ui/skeleton"

import type { IncidentLike } from "../types"
import { coordinates, EMPTY, formatDateTime, mapsUrl, roleLabel } from "../utils"
import { FieldGrid, InfoRow, Panel, TextBlock } from "./ui"

const IncidentLocationMap = lazy(() => import("./IncidentLocationMap"))

interface OverviewProps {
  incident: IncidentLike
  /** Link of the transport code; the Customer and crew views have no admin transport page to go to. */
  transportHref?: string
  /** Crew header already shows the title, time and transport, so the block leaves them out. */
  compact?: boolean
}

/** Incident Overview block of SCR-F5-002 / 003. The phone number only exists in the staff response. */
export function IncidentOverview({ incident, transportHref, compact = false }: OverviewProps) {
  const { reportedBy, transport } = incident
  const phone = "phone" in reportedBy ? reportedBy.phone : null
  return (
    <Panel title="Incident overview" icon={ClipboardList}>
      <FieldGrid className="lg:grid-cols-3">
        {compact ? null : (
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
        )}
        <InfoRow label="Booking">{transport?.bookingCode}</InfoRow>
        {compact ? null : <InfoRow label="Occurred at">{formatDateTime(incident.occurredAt)}</InfoRow>}
        <InfoRow label="Reported at">{formatDateTime(incident.reportedAt)}</InfoRow>
        <InfoRow label="Reported by" className={compact ? "col-span-2" : undefined}>
          {reportedBy.fullName} <span className="font-normal text-slate-500">({roleLabel(reportedBy.role)})</span>
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="mt-0.5 block text-xs font-medium text-amber-700 underline-offset-2 hover:underline">{phone}</a>
          ) : null}
        </InfoRow>
        {compact ? null : <InfoRow label="Title" className="col-span-2 md:col-span-3">{incident.title}</InfoRow>}
      </FieldGrid>
      <dl className="m-0 mt-3.5 grid gap-3 md:grid-cols-2">
        <TextBlock label="Immediate action">{incident.immediateAction}</TextBlock>
        <TextBlock label="Description">{incident.description}</TextBlock>
      </dl>
    </Panel>
  )
}

/** Result of a closed incident (resolution or cancellation), shown above the overview. */
export function IncidentOutcome({ incident }: { incident: IncidentLike }) {
  if (incident.status === "RESOLVED") {
    return (
      <Panel title="Resolution" className="border-emerald-200 bg-emerald-50/40">
        <dl className="m-0 grid gap-3">
          <InfoRow label="Resolved at">{formatDateTime(incident.resolvedAt)}</InfoRow>
          <TextBlock label="Resolution summary">{incident.resolutionSummary}</TextBlock>
        </dl>
      </Panel>
    )
  }
  if (incident.status === "CANCELLED") {
    return (
      <Panel title="Cancellation" className="border-slate-300 bg-slate-50">
        <dl className="m-0 grid gap-3">
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
      icon={MapPin}
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
        <div className="grid gap-3.5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <FieldGrid className="content-start md:grid-cols-1 lg:grid-cols-2">
            <InfoRow label="Place" className="col-span-2 md:col-span-1 lg:col-span-2">{location.locationName}</InfoRow>
            <InfoRow label="City">{location.city}</InfoRow>
            <InfoRow label="Country">{location.country}</InfoRow>
            <InfoRow label="GPS" className="col-span-2 md:col-span-1 lg:col-span-2">{coordinates(location)}</InfoRow>
          </FieldGrid>
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
