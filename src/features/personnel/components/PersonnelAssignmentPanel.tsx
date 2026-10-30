import { Lock, Pencil, UserRoundCheck, Users } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { PLAN_LOCKED_STATUSES } from "@/features/personnel/constants"
import { useAssignments, usePrimaryRoutePlan, useRoutePlanSummary, useTransportPlanSummary } from "@/features/personnel/hooks"
import type { EmployeeBrief, Phase1Person } from "@/features/personnel/types"
import { buildSegmentRows, formatDate, formatDateTime, getPersonnelErrorCode, segmentAssignmentState, type SegmentRow } from "@/features/personnel/utils"
import { InfoNote } from "@/features/personnel/components/PersonnelDialog"
import { Phase1AssignDialog } from "@/features/personnel/components/Phase1AssignDialog"
import { Phase2AssignDialog } from "@/features/personnel/components/Phase2AssignDialog"
import {
  AssignmentStateChip,
  Chip,
  ComplianceDossierChip,
  EmployeeAvatar,
  PersonnelSkeleton,
  RoutePlanStatusChip,
  SegmentTypeChip,
} from "@/features/personnel/components/PersonnelUi"
import { ReplaceSegmentDialog } from "@/features/personnel/components/ReplaceSegmentDialog"
import { ErrorState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

/** Same frame as the sections of the Transport Plan Details page (Section in transport-plan): white, 2px corners, soft shadow. */
const panelClass = "min-w-0 rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs"
const titleClass = "m-0! font-heading text-base! leading-5! uppercase tracking-wide text-slate-900"
const subtitleClass = "m-0 font-heading text-sm uppercase text-slate-600"
const metaLabelClass = "flex items-center gap-1.5 text-[11px] font-medium text-slate-500"
const headClass = "h-10 whitespace-nowrap px-3 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
const actionButton = "shrink-0 rounded-[2px]"

/** Round icon-less tile in front of a section title, like the icon of Section on the details page. */
function SectionIcon({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[2px] border",
        muted ? "border-slate-200 bg-slate-50 text-slate-400" : "border-primary/15 bg-primary/5 text-primary",
      )}
    >
      {children}
    </span>
  )
}

function PersonCell({ employee }: { employee: EmployeeBrief | null }) {
  if (!employee) return <span className="text-slate-400">—</span>
  return (
    <span className="grid leading-5">
      <span className="font-medium text-slate-800">{employee.fullName}</span>
      <span className="text-[11px] text-slate-500">{employee.employeeCode}</span>
    </span>
  )
}

function Phase1PersonCard({ title, employee }: { title: string; employee: Phase1Person | null }) {
  return (
    <div className="grid content-start gap-2.5 rounded-[2px] border border-slate-200 bg-white p-3">
      <h3 className={subtitleClass}>{title}</h3>
      {employee ? (
        <div className="flex items-start gap-3">
          <EmployeeAvatar employee={employee} />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-medium leading-5 text-slate-800">{employee.fullName}</span>
            <span className="text-[11px] text-slate-500">{employee.employeeCode}</span>
            {employee.email ? <span className="truncate text-xs text-slate-600">{employee.email}</span> : null}
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <Chip tone="green">Assigned</Chip>
              {employee.assignedAt ? <span className="text-[11px] text-slate-500">since {formatDate(employee.assignedAt)}</span> : null}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-sm text-slate-400">Not assigned yet</span>
      )}
    </div>
  )
}

interface PersonnelAssignmentPanelProps {
  transportPlanId: string
  className?: string
}

/**
 * UC-36 personnel assignment for one transport plan: Phase 1 (TS + RC) and Phase 2 (Driver + Escort per segment).
 * Public export of the personnel feature: it needs only the plan id, so it works on its own page and inside the
 * Personnel tab of the transport plan detail. Only the Logistics Manager gets the action buttons (PS1/PS3/PS4/PS5 are LM-only).
 */
export function PersonnelAssignmentPanel({ transportPlanId, className }: PersonnelAssignmentPanelProps) {
  const principal = useAuthStore((state) => state.principal)
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })

  const planQuery = useTransportPlanSummary(transportPlanId)
  const assignmentsQuery = useAssignments(transportPlanId)
  const assignments = assignmentsQuery.data
  const phase2 = assignments?.phase2
  const routePlanQuery = useRoutePlanSummary(phase2?.enabled ? phase2.routePlanId : null)
  const primaryRouteQuery = usePrimaryRoutePlan(transportPlanId, Boolean(assignments) && !phase2?.enabled)

  const [phase1Mode, setPhase1Mode] = useState<"assign" | "change" | null>(null)
  const [phase2Open, setPhase2Open] = useState(false)
  const [replaceRowId, setReplaceRowId] = useState<string | null>(null)

  const rows = useMemo(() => buildSegmentRows(phase2?.segments ?? [], routePlanQuery.data?.segments), [phase2?.segments, routePlanQuery.data?.segments])
  const replaceRow: SegmentRow | null = rows.find((row) => row.routePlanRouteId === replaceRowId) ?? null

  if ((planQuery.isLoading || assignmentsQuery.isLoading) && !assignments) return <PersonnelSkeleton />

  if (planQuery.isError || assignmentsQuery.isError || !planQuery.data || !assignments || !phase2) {
    const code = getPersonnelErrorCode(assignmentsQuery.error ?? planQuery.error)
    const message =
      code === "FORBIDDEN"
        ? "You are not assigned to this transport plan."
        : code === "TRANSPORT_PLAN_NOT_FOUND"
          ? "Transport plan not found."
          : "Unable to load the personnel assignment."
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          void planQuery.refetch()
          void assignmentsQuery.refetch()
        }}
      />
    )
  }

  const plan = planQuery.data
  const { phase1 } = assignments
  const planLocked = PLAN_LOCKED_STATUSES.includes(plan.status)
  const depositPending = plan.status !== "APPROVED" && !planLocked
  const routeStatus = routePlanQuery.data?.status ?? primaryRouteQuery.data?.status
  // The LM cancelled the booking: the BE closes the plans but keeps the assigned people as history, so the lists stay and only editing stops.
  const planCancelled = plan.status === "CANCELLED"
  const routeCancelled = routeStatus === "CANCELLED"
  const closed = planCancelled || routeCancelled
  const phase2Locked = planLocked || routeCancelled
  const pendingInternal = rows.filter((row) => !row.isOutsourced && !row.driver && !row.escort).length
  const phase1Ready = phase1.isAssigned

  let phase1Hint: string | null = null
  if (!phase1Ready && depositPending) phase1Hint = "Phase 1 opens once the customer's deposit is paid (transport plan APPROVED)."
  else if (planCancelled) phase1Hint = "This transport plan was cancelled: the assignments below are kept as history and cannot be changed."
  else if (planLocked) phase1Hint = "This transport plan is in progress, completed or cancelled: assignments are locked."
  else if (phase1Ready && phase1.isLocked) phase1Hint = "Phase 1 is locked because Phase 2 is open."

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4", className)}>
      {closed ? (
        <div role="status" className="flex items-start gap-3 rounded-[2px] border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="m-0 font-semibold">{planCancelled ? "Transport plan cancelled" : "Route plan cancelled"}</p>
            <p className="m-0 mt-1 text-xs">The assigned personnel stay visible as history. Assigning or changing personnel is closed.</p>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------ Phase 1 */}
      <section className={cn(panelClass, "space-y-3")} aria-labelledby="phase1-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <SectionIcon>
              <UserRoundCheck className="size-3.5" aria-hidden="true" />
            </SectionIcon>
            <div className="min-w-0">
              <h2 id="phase1-title" className={titleClass}>
                Phase 1 — Transport Specialist &amp; Route Coordinator
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Assigned by the Logistics Manager once the transport plan is approved (deposit paid).</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {phase1Ready ? <Chip tone="green">Assigned</Chip> : <Chip tone="amber">Pending</Chip>}
            {phase1.isLocked ? (
              <Chip tone="slate">
                <Lock className="mr-1 size-3" aria-hidden="true" />
                Locked
              </Chip>
            ) : null}
            {isManager ? (
              phase1Ready ? (
                <Button type="button" size="sm" className={actionButton} disabled={phase1.isLocked || planLocked} onClick={() => setPhase1Mode("change")}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Change Phase 1
                </Button>
              ) : (
                <Button type="button" size="sm" className={actionButton} disabled={depositPending || planLocked} onClick={() => setPhase1Mode("assign")}>
                  <UserRoundCheck className="size-4" aria-hidden="true" />
                  Assign Phase 1
                </Button>
              )
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Phase1PersonCard title="Transport Specialist (TS)" employee={phase1.transportSpecialist} />
          <Phase1PersonCard title="Route Coordinator (RC)" employee={phase1.routeCoordinator} />
        </div>
        {phase1Hint ? <p className="m-0 text-xs leading-5 text-slate-500">{phase1Hint}</p> : null}
      </section>

      {/* ------------------------------------------------ Phase 2 */}
      <section className={cn(panelClass, "space-y-3")} aria-labelledby="phase2-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <SectionIcon muted={!phase2.enabled}>
              <Users className="size-3.5" aria-hidden="true" />
            </SectionIcon>
            <div className="min-w-0">
              <h2 id="phase2-title" className={titleClass}>
                Phase 2 — Driver &amp; Escort by route segment
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Available after the route plan is confirmed as legally feasible.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {routeStatus ? (
              <span className={metaLabelClass}>
                Route plan <RoutePlanStatusChip status={routeStatus} />
              </span>
            ) : null}
            {assignments.complianceDossier ? (
              <span className={metaLabelClass}>
                Compliance dossier <ComplianceDossierChip status={assignments.complianceDossier.status} />
              </span>
            ) : null}
            {phase2.enabled ? (
              phase2.isPersonnelComplete ? <Chip tone="green">Personnel complete</Chip> : <Chip tone="amber">Personnel incomplete</Chip>
            ) : null}
            {isManager && phase2.enabled ? (
              <Button type="button" size="sm" className={actionButton} disabled={pendingInternal === 0 || phase2Locked} onClick={() => setPhase2Open(true)}>
                <Users className="size-4" aria-hidden="true" />
                Assign Phase 2
              </Button>
            ) : null}
          </div>
        </div>

        {!phase2.enabled && !closed ? (
          <div className="flex items-start gap-3 rounded-[2px] border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="m-0 font-semibold">Phase 2 is locked.</p>
              <p className="m-0 mt-1 text-xs">
                Drivers and escorts can be assigned once the Transport Specialist confirms the route plan is feasible (route plan CONFIRMED).
                {!routeStatus ? " No route plan has been created for this transport plan yet." : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {routePlanQuery.isError ? <InfoNote tone="warning">Route details could not be loaded; locations and distances are hidden.</InfoNote> : null}
            {rows.length === 0 ? (
              <p className="m-0 rounded-[2px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{closed ? "No segments were staffed before this plan was cancelled." : "This route plan has no segments yet."}</p>
            ) : (
              <div className="overflow-hidden rounded-[2px] border border-slate-200">
                <Table className="min-w-[820px] text-[13px]">
                  <TableHeader className="bg-[#f2efe8] [&_tr]:border-b-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className={cn(headClass, "w-10")}>#</TableHead>
                      <TableHead className={headClass}>From</TableHead>
                      <TableHead className={headClass}>To</TableHead>
                      <TableHead className={headClass}>Departure</TableHead>
                      <TableHead className={headClass}>Type</TableHead>
                      <TableHead className={headClass}>Driver</TableHead>
                      <TableHead className={headClass}>Escort</TableHead>
                      <TableHead className={headClass}>State</TableHead>
                      <TableHead className={cn(headClass, "text-right")}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const locked = row.status === "IN_PROGRESS" || row.status === "COMPLETED"
                      const canChange = isManager && !row.isOutsourced && Boolean(row.driver || row.escort) && !phase2Locked
                      return (
                        <TableRow key={row.routePlanRouteId} className={cn("border-slate-200 align-top hover:bg-amber-50/60 [&>td]:px-3 [&>td]:py-2.5", index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]")}>
                          <TableCell className="font-medium text-slate-500">{row.sequenceNo}</TableCell>
                          <TableCell className="whitespace-normal font-medium text-slate-800">{row.fromName}</TableCell>
                          <TableCell className="whitespace-normal font-medium text-slate-800">{row.toName}</TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600">{formatDateTime(row.plannedDepartureAt)}</TableCell>
                          <TableCell>
                            <SegmentTypeChip outsourced={row.isOutsourced} />
                          </TableCell>
                          {row.isOutsourced ? (
                            <TableCell colSpan={2} className="whitespace-normal text-slate-500">
                              Outsourced — handled by {row.provider ? `${row.provider.providerName} (${row.provider.providerCode})` : "the provider"}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell>
                                <PersonCell employee={row.driver} />
                              </TableCell>
                              <TableCell>
                                <PersonCell employee={row.escort} />
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <AssignmentStateChip state={segmentAssignmentState(row)} />
                          </TableCell>
                          <TableCell className="text-right">
                            {canChange ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={locked}
                                title={locked ? "This segment has already departed." : "Change driver / escort"}
                                className="h-7 rounded-[2px] px-2 text-xs"
                                onClick={() => setReplaceRowId(row.routePlanRouteId)}
                              >
                                {locked ? <Lock className="size-3" aria-hidden="true" /> : <Pencil className="size-3" aria-hidden="true" />}
                                Change
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {isManager && !phase2Locked && pendingInternal === 0 && rows.length > 0 && phase2.isPersonnelComplete ? (
              <p className="m-0 text-xs leading-5 text-slate-500">Every internal segment is staffed. Use “Change” to replace a driver or an escort before departure.</p>
            ) : null}
            {!isManager ? <p className="m-0 text-xs leading-5 text-slate-500">Only the Logistics Manager can assign or change personnel.</p> : null}
          </div>
        )}
      </section>

      {isManager ? (
        <>
          <Phase1AssignDialog open={phase1Mode !== null} onOpenChange={(open) => !open && setPhase1Mode(null)} mode={phase1Mode ?? "assign"} plan={plan} phase1={phase1} />
          <Phase2AssignDialog
            open={phase2Open}
            onOpenChange={setPhase2Open}
            plan={plan}
            routePlan={routePlanQuery.data}
            dossier={assignments.complianceDossier ?? null}
            rows={rows}
          />
          <ReplaceSegmentDialog row={replaceRow} onOpenChange={(open) => !open && setReplaceRowId(null)} plan={plan} routePlan={routePlanQuery.data} />
        </>
      ) : null}
    </div>
  )
}
