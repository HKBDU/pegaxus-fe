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

const primaryButton =
  "h-9 shrink-0 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300] disabled:bg-slate-200 disabled:text-slate-400"

function PersonCell({ employee }: { employee: EmployeeBrief | null }) {
  if (!employee) return <span className="text-slate-400">—</span>
  return (
    <span className="grid leading-tight">
      <span className="font-semibold text-slate-900">{employee.fullName}</span>
      <span className="font-mono text-[10px] text-slate-500">{employee.employeeCode}</span>
    </span>
  )
}

function Phase1PersonCard({ title, employee }: { title: string; employee: Phase1Person | null }) {
  return (
    <div className="grid gap-2 border bg-slate-50 p-4">
      <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</span>
      {employee ? (
        <div className="flex items-start gap-3">
          <EmployeeAvatar employee={employee} />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-sm font-bold text-slate-900">{employee.fullName}</span>
            <span className="font-mono text-[11px] text-slate-500">{employee.employeeCode}</span>
            {employee.email ? <span className="truncate text-xs text-slate-600">{employee.email}</span> : null}
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <Chip tone="green">Assigned</Chip>
              {employee.assignedAt ? <span className="text-[11px] text-slate-500">since {formatDate(employee.assignedAt)}</span> : null}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-sm italic text-slate-400">Not assigned yet</span>
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
  const pendingInternal = rows.filter((row) => !row.isOutsourced && !row.driver && !row.escort).length
  const phase1Ready = phase1.isAssigned

  let phase1Hint: string | null = null
  if (!phase1Ready && depositPending) phase1Hint = "Phase 1 opens once the customer's deposit is paid (transport plan APPROVED)."
  else if (planLocked) phase1Hint = "This transport plan is in progress, completed or cancelled: assignments are locked."
  else if (phase1Ready && phase1.isLocked) phase1Hint = "Phase 1 is locked because Phase 2 is open."

  return (
    <div className={cn("grid gap-5", className)}>
      {/* ------------------------------------------------ Phase 1 */}
      <section className="booking-panel border bg-white p-5" aria-labelledby="phase1-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#ef8f00] text-sm font-bold text-white">1</span>
            <div>
              <h2 id="phase1-title" className="m-0! font-sans text-base! font-bold! leading-6! text-slate-900!">
                Phase 1 — Transport Specialist & Route Coordinator
              </h2>
              <p className="m-0 text-xs text-slate-500">Assigned by the Logistics Manager once the transport plan is approved (deposit paid).</p>
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
                <Button type="button" className={primaryButton} disabled={phase1.isLocked || planLocked} onClick={() => setPhase1Mode("change")}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Change Phase 1
                </Button>
              ) : (
                <Button type="button" className={primaryButton} disabled={depositPending || planLocked} onClick={() => setPhase1Mode("assign")}>
                  <UserRoundCheck className="size-4" aria-hidden="true" />
                  Assign Phase 1
                </Button>
              )
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Phase1PersonCard title="Transport Specialist (TS)" employee={phase1.transportSpecialist} />
          <Phase1PersonCard title="Route Coordinator (RC)" employee={phase1.routeCoordinator} />
        </div>
        {phase1Hint ? <p className="m-0 mt-3 text-xs text-slate-500">{phase1Hint}</p> : null}
      </section>

      {/* ------------------------------------------------ Phase 2 */}
      <section className="booking-panel border bg-white p-5" aria-labelledby="phase2-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white", phase2.enabled ? "bg-[#ef8f00]" : "bg-slate-300")}>2</span>
            <div>
              <h2 id="phase2-title" className="m-0! font-sans text-base! font-bold! leading-6! text-slate-900!">
                Phase 2 — Driver & Escort by route segment
              </h2>
              <p className="m-0 text-xs text-slate-500">Available after the route plan is confirmed as legally feasible.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {routeStatus ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Route plan <RoutePlanStatusChip status={routeStatus} />
              </span>
            ) : null}
            {assignments.complianceDossier ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Compliance dossier <ComplianceDossierChip status={assignments.complianceDossier.status} />
              </span>
            ) : null}
            {phase2.enabled ? (
              phase2.isPersonnelComplete ? <Chip tone="green">Personnel complete</Chip> : <Chip tone="amber">Personnel incomplete</Chip>
            ) : null}
            {isManager && phase2.enabled ? (
              <Button type="button" className={primaryButton} disabled={pendingInternal === 0 || planLocked} onClick={() => setPhase2Open(true)}>
                <Users className="size-4" aria-hidden="true" />
                Assign Phase 2
              </Button>
            ) : null}
          </div>
        </div>

        {!phase2.enabled ? (
          <div className="mt-4 flex items-start gap-3 border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
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
          <div className="mt-4">
            {routePlanQuery.isError ? <InfoNote tone="warning">Route details could not be loaded; locations and distances are hidden.</InfoNote> : null}
            {rows.length === 0 ? (
              <p className="m-0 border border-dashed p-6 text-center text-sm text-slate-500">This route plan has no segments yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto border">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                  <thead className="bg-[#f3f3f3] font-heading text-[10px] uppercase tracking-[0.08em] text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">From</th>
                      <th className="px-3 py-2.5 font-semibold">To</th>
                      <th className="px-3 py-2.5 font-semibold">Departure</th>
                      <th className="px-3 py-2.5 font-semibold">Type</th>
                      <th className="px-3 py-2.5 font-semibold">Driver</th>
                      <th className="px-3 py-2.5 font-semibold">Escort</th>
                      <th className="px-3 py-2.5 font-semibold">State</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => {
                      const locked = row.status === "IN_PROGRESS" || row.status === "COMPLETED"
                      const canChange = isManager && !row.isOutsourced && Boolean(row.driver || row.escort) && !planLocked
                      return (
                        <tr key={row.routePlanRouteId} className="align-top">
                          <td className="px-3 py-3 font-semibold text-slate-500">{row.sequenceNo}</td>
                          <td className="px-3 py-3 text-slate-900">{row.fromName}</td>
                          <td className="px-3 py-3 text-slate-900">{row.toName}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(row.plannedDepartureAt)}</td>
                          <td className="px-3 py-3">
                            <SegmentTypeChip outsourced={row.isOutsourced} />
                          </td>
                          {row.isOutsourced ? (
                            <td colSpan={2} className="px-3 py-3 italic text-slate-500">
                              Outsourced — handled by {row.provider ? `${row.provider.providerName} (${row.provider.providerCode})` : "the provider"}
                            </td>
                          ) : (
                            <>
                              <td className="px-3 py-3">
                                <PersonCell employee={row.driver} />
                              </td>
                              <td className="px-3 py-3">
                                <PersonCell employee={row.escort} />
                              </td>
                            </>
                          )}
                          <td className="px-3 py-3">
                            <AssignmentStateChip state={segmentAssignmentState(row)} />
                          </td>
                          <td className="px-3 py-3 text-right">
                            {canChange ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={locked}
                                title={locked ? "This segment has already departed." : "Change driver / escort"}
                                className="h-7 rounded-[2px] px-2 text-[11px]"
                                onClick={() => setReplaceRowId(row.routePlanRouteId)}
                              >
                                {locked ? <Lock className="size-3" aria-hidden="true" /> : <Pencil className="size-3" aria-hidden="true" />}
                                Change
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {isManager && pendingInternal === 0 && rows.length > 0 && phase2.isPersonnelComplete ? (
              <p className="m-0 mt-3 text-xs text-slate-500">Every internal segment is staffed. Use “Change” to replace a driver or an escort before departure.</p>
            ) : null}
            {!isManager ? <p className="m-0 mt-3 text-xs text-slate-500">Only the Logistics Manager can assign or change personnel.</p> : null}
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
