import { useState, type ReactNode } from "react"
import { ArrowLeft, CheckCircle2, Clock, Truck, XCircle } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { EMERGENCY_COST_CATEGORY, EMERGENCY_COST_STATUS, INCIDENT_ACTION } from "@/shared/constants/incident"
import type { IncidentAction } from "@/shared/types/incident"
import { CategoryBadge, SeverityBadge, StatusBadge } from "@/shared/components/incident"
import { ErrorState, NotFoundPage } from "@/shared/components/common"
import { RaiseSeverityButton } from "@/features/incident-report"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useIsDesktop } from "@/shared/hooks"

import { CancelIncidentDialog } from "../components/CancelIncidentDialog"
import { DetachHorseDialog } from "../components/DetachHorseDialog"
import { IncidentHoldNotice } from "../components/IncidentHoldNotice"
import { IncidentLocation, IncidentOutcome, IncidentOverview } from "../components/IncidentInfoPanels"
import { IncidentTimeline } from "../components/IncidentTimeline"
import { ResolveIncidentDialog } from "../components/ResolveIncidentDialog"
import { EmergencyCostSection, HorseDetailsSection, IncidentResponseActions, VehicleDetailSection } from "../components/slots"
import { actionButtonClass, dangerButtonClass, outlineButtonClass, panelClass, primaryButtonClass } from "../components/ui"
import { incidentRoutes, severityEdge } from "../constants"
import { isNotFound } from "../errors"
import { useIncident } from "../hooks/useIncidents"
import { useIncidentViewer } from "../hooks/useViewer"
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

/** Desktop summary: the page's white panel with the severity on its left edge, instead of the phone's dark hero card. */
function CrewSummaryCard({ incident }: { incident: Incident }) {
  return (
    <section aria-label="Incident summary" className={cn(panelClass, "border-l-4 p-4", severityEdge[incident.severity] ?? "border-l-slate-400")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Incident</p>
          <h1 className="m-0! mt-0.5 font-heading text-lg! leading-6! font-semibold! tracking-normal! text-slate-900!">{incident.incidentCode}</h1>
        </div>
        <SeverityBadge severity={incident.severity} />
      </div>
      <p className="m-0 mt-2 text-sm font-medium leading-5 text-slate-800">{incident.title}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={incident.category} />
        <StatusBadge status={incident.status} />
      </div>
      <dl className="m-0 mt-3 grid gap-1.5 border-t border-[#eceae3] pt-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <dd className="m-0">{formatDateTime(incident.occurredAt)} <span className="text-slate-400">· {timeAgo(incident.occurredAt, new Date(incident.serverTime).getTime())}</span></dd>
        </div>
        {incident.transport ? (
          <div className="flex items-center gap-2">
            <Truck className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <dd className="m-0">{incident.transport.transportCode}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}

/** Desktop crew buttons: the web's sentence-case 36px buttons, full width in the side column. */
const deskButtonClass =
  "inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
const deskPrimaryClass = "border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover"
const deskOutlineClass = "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
const deskDangerClass = "border-red-200 bg-white text-red-700 hover:bg-red-50"

/**
 * Crew actions on a desktop: a panel under the summary in the sticky side column, instead of the phone's bottom bar,
 * which stretched across the whole screen. Only buttons are sized here (via data-slot), so the response actions' own
 * group keeps working. Hides itself when every action renders nothing.
 */
function CrewDesktopActions({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Incident actions" className={cn(panelClass, "p-3 has-[>div:empty]:hidden")}>
      <p className="m-0 mb-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">Actions</p>
      <div className="flex flex-col gap-2 [&>div]:flex [&>div]:w-full [&>div]:flex-col [&>div]:gap-2 [&_[data-slot=button]]:h-9 [&_[data-slot=button]]:min-h-0 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium">
        {children}
      </div>
    </section>
  )
}

/** The crew's actions stay in reach of a thumb: pinned to the bottom of the screen, full-size buttons. */
function CrewActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 has-[>div:empty]:hidden border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur">
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
  const [detachHorse, setDetachHorse] = useState<{ horseId: string; horseName: string } | null>(null)
  const { isCoordinator } = useIncidentViewer()
  const isDesktop = useIsDesktop()

  if (query.isError && isNotFound(query.error)) return <NotFoundPage />

  const isCrew = audience === "crew"
  // The crew page was built for a phone (one 768px column and a bottom action bar), which left a narrow strip in the middle
  // of a desktop screen. From 1024px it uses two columns: the sections, and a sticky summary with the actions.
  const crewDesktop = isCrew && isDesktop
  const actions = incident?.availableActions ?? []
  const can = (action: string) => actions.includes(action)
  const resolveMode = can(INCIDENT_ACTION.RESOLVE) ? "manager" : "self"
  const showVehicle = incident && (incident.category === "VEHICLE" || incident.category === "BOTH")
  const showHorse = incident && (incident.category === "HORSE_HEALTH" || incident.category === "BOTH")
  const canResolve = can(INCIDENT_ACTION.RESOLVE) || can(INCIDENT_ACTION.SELF_RESOLVE)
  const canCancel = can(INCIDENT_ACTION.CANCEL_INCIDENT)
  const refetch = () => void query.refetch()
  // The bar is shown when ANY button can appear: the ones above, the severity button, or one of Duong's response actions.
  // Their own components decide whether they render, so the bar also hides itself when it ends up empty (`empty:hidden`).
  const hasButtons =
    canResolve ||
    canCancel ||
    (isCoordinator && showVehicle && incident.transport?.status === "IN_TRANSIT" && ["REPORTED", "PENDING"].includes(incident.status)) ||
    [INCIDENT_ACTION.RAISE_SEVERITY, "LOWER_SEVERITY", INCIDENT_ACTION.REQUEST_COST, INCIDENT_ACTION.HOLD_ROUTE, INCIDENT_ACTION.PROPOSE_REROUTE, INCIDENT_ACTION.ESCALATE_REROUTE].some(can)
  // The BE tells nobody but the requester when the LM approves a replacement vehicle, so the RC reads it on the page (U-03).
  const waitingForVehicleChange =
    isCoordinator &&
    Boolean(incident) &&
    (incident?.status === "REPORTED" || incident?.status === "PENDING") &&
    Boolean(incident?.costRequests.some((request) => request.category === EMERGENCY_COST_CATEGORY.REPLACEMENT_VEHICLE && request.status === EMERGENCY_COST_STATUS.APPROVED))

  // Desktop crew buttons use the web's button style; the phone bar and the staff header keep the compact upper-case one.
  const resolveButton = canResolve ? (
    <button type="button" className={crewDesktop ? cn(deskButtonClass, deskPrimaryClass) : cn(actionButtonClass, primaryButtonClass)} onClick={() => setResolveOpen(true)}>
      <CheckCircle2 className="size-4" aria-hidden="true" />
      {resolveMode === "manager" ? "Resolve incident" : "Mark as resolved"}
    </button>
  ) : null
  const cancelButton = canCancel ? (
    <button type="button" className={crewDesktop ? cn(deskButtonClass, deskDangerClass) : cn(actionButtonClass, dangerButtonClass)} onClick={() => setCancelOpen(true)}>
      <XCircle className="size-4" aria-hidden="true" />
      {isCrew ? "Cancel report" : "Cancel incident"}
    </button>
  ) : null
  const buttons = incident ? (
    <>
      {/* On desktop the main action leads and the destructive one closes the list. */}
      {crewDesktop ? resolveButton : null}
      <IncidentResponseActions incident={incident} />
      <RaiseSeverityButton
        incidentReportId={incident.incidentReportId}
        severity={incident.severity}
        lastUpdatedAt={incident.updatedAt}
        availableActions={incident.availableActions as IncidentAction[]}
        onChanged={refetch}
        className={crewDesktop ? cn(deskButtonClass, deskOutlineClass, "min-h-0") : cn(actionButtonClass, outlineButtonClass, "min-h-0")}
      />
      {crewDesktop ? null : resolveButton}
      {cancelButton}
    </>
  ) : null

  return (
    <div className={cn("booking-page-shell min-h-[70dvh] bg-[#f4f2ed] font-sans", isCrew ? cn("px-3 pt-3 lg:px-10 lg:pt-5", hasButtons && !crewDesktop ? "pb-28" : "pb-8") : "px-4 pt-5 pb-8 sm:px-6 lg:px-10")}>
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        {isCrew ? (
          <div className={cn("mb-3", !crewDesktop && "mx-auto max-w-3xl")}>
            <Link to="/crew/transports" className="mb-2.5 inline-flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-amber-700">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Assigned transports
            </Link>
            {incident && !crewDesktop ? <CrewHero incident={incident} /> : null}
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
                  {waitingForVehicleChange ? (
                    <span className="inline-flex h-5 items-center gap-1.5 rounded-[2px] border border-amber-300 bg-amber-50 px-1.5 text-[0.65rem] font-semibold text-amber-800">
                      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      Approved - waiting for vehicle change
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {incident && hasButtons ? <div className="flex flex-wrap items-center gap-2 empty:hidden lg:shrink-0 lg:pb-0.5">{buttons}</div> : null}
          </div>
        )}

        <div className={cn(isCrew && !crewDesktop && "mx-auto max-w-3xl", crewDesktop && "grid grid-cols-[minmax(0,1fr)_340px] items-start gap-4")}>
          <div className="min-w-0">
            {query.isLoading ? <DetailSkeleton /> : null}
            {query.isError && !isNotFound(query.error) ? <ErrorState message="Unable to load this incident." onRetry={() => void query.refetch()} /> : null}

            {incident ? (
              <div className="booking-stagger space-y-2.5">
                {incident.hold ? <IncidentHoldNotice hold={incident.hold} /> : null}
                <IncidentOutcome incident={incident} />
                {/* Compact for the crew on every screen: the summary card already shows the code and the time. */}
                <IncidentOverview incident={incident} transportHref={!isCrew && incident.transport ? incidentRoutes.transport(incident.transport.transportId) : undefined} compact={isCrew} />
                <IncidentLocation incident={incident} />
                {showVehicle ? <VehicleDetailSection incident={incident} /> : null}
                {showHorse ? <HorseDetailsSection incident={incident} onDetach={can(INCIDENT_ACTION.DETACH_HORSE) ? setDetachHorse : undefined} /> : null}
                <EmergencyCostSection incident={incident} onChanged={refetch} />
                <IncidentTimeline incident={incident} />
              </div>
            ) : null}
          </div>

          {crewDesktop && incident ? (
            <aside className="sticky top-16 space-y-3">
              <CrewSummaryCard incident={incident} />
              {hasButtons ? <CrewDesktopActions>{buttons}</CrewDesktopActions> : null}
            </aside>
          ) : null}
        </div>
      </div>

      {incident && isCrew && !crewDesktop && hasButtons ? <CrewActionBar>{buttons}</CrewActionBar> : null}

      {incident ? (
        <>
          <ResolveIncidentDialog incident={incident} mode={resolveMode} open={resolveOpen} onOpenChange={setResolveOpen} onReload={refetch} />
          <CancelIncidentDialog incident={incident} audience={audience} open={cancelOpen} onOpenChange={setCancelOpen} onReload={() => void query.refetch()} />
          <DetachHorseDialog incident={incident} horse={detachHorse} onOpenChange={(next) => { if (!next) setDetachHorse(null) }} onReload={refetch} />
        </>
      ) : null}
    </div>
  )
}
