import { useParams } from "react-router-dom"

import { CategoryBadge, SeverityBadge, StatusBadge } from "@/shared/components/incident"
import { ErrorState, NotFoundPage } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"

import { IncidentHoldNotice } from "../components/IncidentHoldNotice"
import { IncidentLocation, IncidentOutcome, IncidentOverview } from "../components/IncidentInfoPanels"
import { IncidentTimeline } from "../components/IncidentTimeline"
import { HorseDetailsSection, VehicleDetailSection } from "../components/slots"
import { isNotFound } from "../errors"
import { useCustomerIncident } from "../hooks/useIncidents"

/**
 * SCR-F5-003 (UC-57): what the owner of the booking may see. Read-only: the BE sends an allowlist DTO (no phone, costs or
 * actions) and answers 404 for LOW / MEDIUM incidents and for someone else's booking, which is shown as "not found".
 */
export default function CustomerIncidentPage() {
  const { bookingId = "", transportId = "", incidentReportId } = useParams()
  const query = useCustomerIncident(incidentReportId)
  const incident = query.data

  if (query.isError && isNotFound(query.error)) return <NotFoundPage />

  return (
    <div className="booking-page-shell min-h-[70dvh] bg-[#f4f2ed] px-4 pt-5 pb-8 font-sans sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3">
          <PageHeader
            title="INCIDENT DETAILS"
            backHref={`/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(transportId)}`}
            backLabel="BACK TO TRANSPORT"
          />
          {incident ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-lg font-semibold leading-5 text-gray-900">{incident.incidentCode}</span>
              <CategoryBadge category={incident.category} />
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          ) : null}
        </div>

        {query.isLoading ? (
          <div className="space-y-2.5" aria-busy="true">
            {[28, 40, 52].map((height) => <Skeleton key={height} className="w-full rounded-none bg-slate-100" style={{ height: `${height * 4}px` }} />)}
          </div>
        ) : null}
        {query.isError && !isNotFound(query.error) ? <ErrorState message="Unable to load this incident." onRetry={() => void query.refetch()} /> : null}

        {incident ? (
          <div className="booking-stagger space-y-2.5">
            {incident.hold ? <IncidentHoldNotice hold={incident.hold} /> : null}
            <IncidentOutcome incident={incident} />
            <IncidentOverview incident={incident} />
            <IncidentLocation incident={incident} />
            {incident.category === "VEHICLE" || incident.category === "BOTH" ? <VehicleDetailSection incident={incident} /> : null}
            {incident.category === "HORSE_HEALTH" || incident.category === "BOTH" ? <HorseDetailsSection incident={incident} /> : null}
            <IncidentTimeline incident={incident} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
