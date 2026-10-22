import { useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { INCIDENT_ACTION } from "@/shared/constants/incident"
import { CategoryBadge, SeverityBadge, StatusBadge } from "@/shared/components/incident"
import { ErrorState, NotFoundPage } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"

import { CancelIncidentDialog } from "../components/CancelIncidentDialog"
import { IncidentHoldNotice } from "../components/IncidentHoldNotice"
import { IncidentLocation, IncidentOutcome, IncidentOverview } from "../components/IncidentInfoPanels"
import { IncidentTimeline } from "../components/IncidentTimeline"
import { ResolveIncidentDialog } from "../components/ResolveIncidentDialog"
import { EmergencyCostSection, HorseDetailsSection, IncidentResponseActions, VehicleDetailSection } from "../components/slots"
import { actionButtonClass, dangerButtonClass, primaryButtonClass } from "../components/ui"
import { incidentRoutes } from "../constants"
import { isNotFound } from "../errors"
import { useIncident } from "../hooks/useIncidents"
import type { IncidentAudience } from "../types"

function DetailSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {[28, 40, 52].map((height) => (
        <Skeleton key={height} className="w-full rounded-none bg-slate-100" style={{ height: `${height * 4}px` }} />
      ))}
    </div>
  )
}

/**
 * SCR-F5-002 (UC-57, UC-60): one incident for staff (`admin`, desktop) and for the crew (`crew`, one column for a phone).
 * Every write button exists only when its name is in `availableActions` (contract R15); closing buttons are mine, the rest
 * of the actions and the vehicle / horse / cost blocks are mounted from `components/slots.tsx`.
 */
export default function IncidentDetailPage({ audience }: { audience: IncidentAudience }) {
  const { incidentReportId } = useParams()
  const query = useIncident(incidentReportId)
  const incident = query.data
  const [resolveOpen, setResolveOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (query.isError && isNotFound(query.error)) return <NotFoundPage />

  const isCrew = audience === "crew"
  const actions = incident?.availableActions ?? []
  const can = (action: string) => actions.includes(action)
  const resolveMode = can(INCIDENT_ACTION.RESOLVE) ? "manager" : "self"
  const showVehicle = incident && (incident.category === "VEHICLE" || incident.category === "BOTH")
  const showHorse = incident && (incident.category === "HORSE_HEALTH" || incident.category === "BOTH")

  return (
    <div className={cn("booking-page-shell min-h-[70dvh] bg-[#f4f2ed] font-sans", isCrew ? "px-3 py-4" : "px-5 pt-5 pb-8 sm:px-6 lg:px-10")}>
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <PageHeader
              title={incident?.incidentCode ?? "INCIDENT"}
              backHref={isCrew ? "/crew/transports" : incidentRoutes.adminList}
              backLabel={isCrew ? "BACK TO ASSIGNED TRANSPORTS" : "BACK TO INCIDENTS"}
              className={isCrew ? "[&_h1]:text-[32px]! [&_h1]:leading-9!" : undefined}
            />
            {incident ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={incident.category} />
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
            ) : null}
          </div>

          {incident ? (
            <div className={cn("flex gap-2 lg:shrink-0", isCrew ? "flex-col [&>*]:h-11" : "flex-row flex-wrap items-center lg:pb-0.5")}>
              <IncidentResponseActions incident={incident} />
              {can(INCIDENT_ACTION.RESOLVE) || can(INCIDENT_ACTION.SELF_RESOLVE) ? (
                <button type="button" className={cn(actionButtonClass, primaryButtonClass)} onClick={() => setResolveOpen(true)}>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  {resolveMode === "manager" ? "Resolve incident" : "Mark as resolved"}
                </button>
              ) : null}
              {can(INCIDENT_ACTION.CANCEL_INCIDENT) ? (
                <button type="button" className={cn(actionButtonClass, dangerButtonClass)} onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-3.5" aria-hidden="true" />
                  Cancel incident
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {query.isLoading ? <DetailSkeleton /> : null}
        {query.isError && !isNotFound(query.error) ? <ErrorState message="Unable to load this incident." onRetry={() => void query.refetch()} /> : null}

        {incident ? (
          <div className="booking-stagger space-y-2.5">
            {incident.hold ? <IncidentHoldNotice hold={incident.hold} /> : null}
            <IncidentOutcome incident={incident} />
            <IncidentOverview incident={incident} transportHref={!isCrew && incident.transport ? incidentRoutes.transport(incident.transport.transportId) : undefined} />
            <IncidentLocation incident={incident} />
            {showVehicle ? <VehicleDetailSection incident={incident} /> : null}
            {showHorse ? <HorseDetailsSection incident={incident} /> : null}
            <EmergencyCostSection incident={incident} />
            <IncidentTimeline incident={incident} />
          </div>
        ) : null}
      </div>

      {incident ? (
        <>
          <ResolveIncidentDialog incident={incident} mode={resolveMode} open={resolveOpen} onOpenChange={setResolveOpen} onReload={() => void query.refetch()} />
          <CancelIncidentDialog incident={incident} open={cancelOpen} onOpenChange={setCancelOpen} onReload={() => void query.refetch()} />
        </>
      ) : null}
    </div>
  )
}
