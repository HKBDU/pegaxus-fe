import { useState, type ReactNode } from "react"
import { ArrowLeft, CheckCircle2, Clock, Truck, XCircle } from "lucide-react"
import { Link, useParams } from "react-router-dom"

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
import { incidentRoutes, severityEdge } from "../constants"
import { isNotFound } from "../errors"
import { useIncident } from "../hooks/useIncidents"
import type { Incident, IncidentAudience } from "../types"
import { formatDateTime, timeAgo } from "../utils"

function DetailSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {[28, 40, 52].map((height) => (
        <Skeleton key={height} className="w-full rounded-none bg-slate-100" style={{ height: `${height * 4}px` }} />
      ))}
    </div>
  )
}

/** Phone header of the crew page: dark card, severity colour on its edge, the facts a driver needs at a glance. */
function CrewHero({ incident }: { incident: Incident }) {
  return (
    <section aria-label="Incident summary" className={cn("rounded-[2px] border-l-[5px] bg-[#17191c] p-4 text-white shadow-sm", severityEdge[incident.severity] ?? "border-l-slate-400")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 font-heading text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Incident</p>
          <h1 className="m-0! font-heading text-[28px]! leading-8! font-bold! tracking-normal! text-white!">{incident.incidentCode}</h1>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>
      <p className="m-0 mt-2 text-base font-semibold leading-6 text-white">{incident.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={incident.category} />
        <StatusBadge status={incident.status} />
      </div>
      <dl className="m-0 mt-3.5 grid gap-1.5 border-t border-white/15 pt-3 text-[13px] text-white/80">
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-white/50" aria-hidden="true" />
          <dd className="m-0">{formatDateTime(incident.occurredAt)} <span className="text-white/55">· {timeAgo(incident.occurredAt, new Date(incident.serverTime).getTime())}</span></dd>
        </div>
        {incident.transport ? (
          <div className="flex items-center gap-2">
            <Truck className="size-4 shrink-0 text-white/50" aria-hidden="true" />
            <dd className="m-0">{incident.transport.transportCode}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}

/** The crew's actions stay in reach of a thumb: pinned to the bottom of the screen, full-size buttons. */
function CrewActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 [&>*]:h-12 [&>*]:min-w-[8rem] [&>*]:flex-1 [&>*]:text-xs">{children}</div>
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
  const canResolve = can(INCIDENT_ACTION.RESOLVE) || can(INCIDENT_ACTION.SELF_RESOLVE)
  const canCancel = can(INCIDENT_ACTION.CANCEL_INCIDENT)

  const buttons = incident ? (
    <>
      <IncidentResponseActions incident={incident} />
      {canResolve ? (
        <button type="button" className={cn(actionButtonClass, primaryButtonClass)} onClick={() => setResolveOpen(true)}>
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {resolveMode === "manager" ? "Resolve incident" : "Mark as resolved"}
        </button>
      ) : null}
      {canCancel ? (
        <button type="button" className={cn(actionButtonClass, dangerButtonClass)} onClick={() => setCancelOpen(true)}>
          <XCircle className="size-4" aria-hidden="true" />
          {isCrew ? "Cancel report" : "Cancel incident"}
        </button>
      ) : null}
    </>
  ) : null
  const hasButtons = canResolve || canCancel

  return (
    <div className={cn("booking-page-shell min-h-[70dvh] bg-[#f4f2ed] font-sans", isCrew ? cn("px-3 pt-3", hasButtons ? "pb-28" : "pb-6") : "px-4 pt-5 pb-8 sm:px-6 lg:px-10")}>
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        {isCrew ? (
          <div className="mx-auto mb-3 max-w-3xl">
            <Link to="/crew/transports" className="mb-2.5 inline-flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-amber-700">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Assigned transports
            </Link>
            {incident ? <CrewHero incident={incident} /> : null}
          </div>
        ) : (
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <PageHeader title={incident?.incidentCode ?? "INCIDENT"} backHref={incidentRoutes.adminList} backLabel="BACK TO INCIDENTS" />
              {incident ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={incident.category} />
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
              ) : null}
            </div>
            {incident && hasButtons ? <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:pb-0.5">{buttons}</div> : null}
          </div>
        )}

        <div className={cn(isCrew && "mx-auto max-w-3xl")}>
          {query.isLoading ? <DetailSkeleton /> : null}
          {query.isError && !isNotFound(query.error) ? <ErrorState message="Unable to load this incident." onRetry={() => void query.refetch()} /> : null}

          {incident ? (
            <div className="booking-stagger space-y-2.5">
              {incident.hold ? <IncidentHoldNotice hold={incident.hold} /> : null}
              <IncidentOutcome incident={incident} />
              <IncidentOverview incident={incident} transportHref={!isCrew && incident.transport ? incidentRoutes.transport(incident.transport.transportId) : undefined} compact={isCrew} />
              <IncidentLocation incident={incident} />
              {showVehicle ? <VehicleDetailSection incident={incident} /> : null}
              {showHorse ? <HorseDetailsSection incident={incident} /> : null}
              <EmergencyCostSection incident={incident} />
              <IncidentTimeline incident={incident} />
            </div>
          ) : null}
        </div>
      </div>

      {incident && isCrew && hasButtons ? <CrewActionBar>{buttons}</CrewActionBar> : null}

      {incident ? (
        <>
          <ResolveIncidentDialog incident={incident} mode={resolveMode} open={resolveOpen} onOpenChange={setResolveOpen} onReload={() => void query.refetch()} />
          <CancelIncidentDialog incident={incident} audience={audience} open={cancelOpen} onOpenChange={setCancelOpen} onReload={() => void query.refetch()} />
        </>
      ) : null}
    </div>
  )
}
