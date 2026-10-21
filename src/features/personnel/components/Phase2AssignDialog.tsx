import { zodResolver } from "@hookform/resolvers/zod"
import { Truck } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useAssignPhase2, useReloadAssignments } from "@/features/personnel/hooks"
import { phase2AssignSchema, type Phase2AssignFormValues } from "@/features/personnel/schemas"
import type { ComplianceDossierBrief, EmployeeBrief, RoutePlanSummary, ScheduleConflictDetails, TransportPlanSummary } from "@/features/personnel/types"
import {
  findConflictCandidate,
  formatDateTime,
  formatDuration,
  getPersonnelErrorCode,
  getPersonnelErrorMessage,
  STALE_ERROR_CODES,
  type ConflictCandidate,
  type SegmentRow,
} from "@/features/personnel/utils"
import { CancelButton, InfoNote, PersonnelDialog, PrimaryButton } from "@/features/personnel/components/PersonnelDialog"
import {
  AssignmentStateChip,
  Chip,
  ComplianceDossierChip,
  EmployeeSelect,
  labelClass,
  RoutePlanStatusChip,
  SegmentTypeChip,
} from "@/features/personnel/components/PersonnelUi"
import { ScheduleConflictDialog, type ScheduleConflict } from "@/features/personnel/components/ScheduleConflictDialog"
import { segmentAssignmentState } from "@/features/personnel/utils"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

interface Phase2AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: TransportPlanSummary
  routePlan: RoutePlanSummary | undefined
  dossier: ComplianceDossierBrief | null
  rows: SegmentRow[]
}

const segmentLabel = (row: SegmentRow) => `Segment ${row.sequenceNo} — ${row.fromName} → ${row.toName}`

/** SCR-F3-017: Driver + Escort for every internal segment, sent once for the whole route (PS3). */
export function Phase2AssignDialog({ open, onOpenChange, plan, routePlan, dossier, rows }: Phase2AssignDialogProps) {
  const assign = useAssignPhase2(plan.transportPlanId)
  const reload = useReloadAssignments(plan.transportPlanId)
  const attempt = useRequestAttemptGuard()
  const [conflict, setConflict] = useState<(ScheduleConflict & { index: number; field: "driverEmployeeId" | "escortEmployeeId" }) | null>(null)
  /** People picked in the dropdowns, kept so a conflict message can be matched back to the person. */
  const picked = useRef(new Map<string, EmployeeBrief>())

  // PS3 only takes internal segments that nobody has been assigned to yet.
  const pendingRows = useMemo(() => rows.filter((row) => !row.isOutsourced && !row.driver && !row.escort), [rows])
  const form = useForm<Phase2AssignFormValues>({
    resolver: zodResolver(phase2AssignSchema),
    defaultValues: { segments: [] },
  })
  const isSaving = assign.isPending

  useEffect(() => {
    if (!open) return
    picked.current.clear()
    setConflict(null)
    attempt.reset()
    form.reset({ segments: pendingRows.map((row) => ({ routePlanRouteId: row.routePlanRouteId, driverEmployeeId: "", escortEmployeeId: "" })) })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    if (!routePlan) return
    try {
      const guarded = await attempt.run(() => assign.mutateAsync({ routePlanId: routePlan.routePlanId, payload: { lastUpdatedAt: routePlan.updatedAt, segments: values.segments } }))
      if (!guarded.started) return
      toast.success("Phase 2 personnel assigned successfully.")
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      const code = getPersonnelErrorCode(error)
      if (code === "SCHEDULE_CONFLICT") {
        const candidates: ConflictCandidate[] = []
        values.segments.forEach((segment) => {
          const driver = picked.current.get(segment.driverEmployeeId)
          const escort = picked.current.get(segment.escortEmployeeId)
          if (driver) candidates.push({ routePlanRouteId: segment.routePlanRouteId, role: "DRIVER", employee: driver })
          if (escort) candidates.push({ routePlanRouteId: segment.routePlanRouteId, role: "ESCORT", employee: escort })
        })
        const message = getPersonnelErrorMessage(error)
        const details = (error as { details?: ScheduleConflictDetails }).details
        const hit = findConflictCandidate((error as { backendMessage?: string }).backendMessage, candidates, details)
        const row = rows.find((item) => item.routePlanRouteId === hit?.routePlanRouteId)
        const index = pendingRows.findIndex((item) => item.routePlanRouteId === hit?.routePlanRouteId)
        if (hit && row && index >= 0) {
          setConflict({
            message,
            role: hit.role,
            employee: hit.employee,
            segmentLabel: segmentLabel(row),
            planCode: plan.planCode,
            details,
            window: { from: row.plannedDepartureAt, to: row.plannedArrivalAt },
            index,
            field: hit.role === "DRIVER" ? "driverEmployeeId" : "escortEmployeeId",
          })
          return
        }
      }
      toast.error(getPersonnelErrorMessage(error, "Unable to assign Phase 2 personnel."))
      if (STALE_ERROR_CODES.has(code)) {
        reload()
        onOpenChange(false)
      }
    }
  })

  const chooseAlternative = (employee: EmployeeBrief) => {
    if (!conflict) return
    picked.current.set(employee.employeeId, employee)
    // Only the conflicting field changes: every other selection stays as the manager left it.
    form.setValue(`segments.${conflict.index}.${conflict.field}`, employee.employeeId, { shouldValidate: true, shouldDirty: true })
    setConflict(null)
  }

  const nothingToAssign = pendingRows.length === 0

  return (
    <>
      <PersonnelDialog
        open={open}
        onOpenChange={(next) => !isSaving && onOpenChange(next)}
        title="Phase 2 assignment by route segment"
        code="SCR-F3-017"
        description="Assign a driver and an escort to every internal segment. Outsourced segments are handled by their provider."
        className="sm:max-w-[760px]"
        footer={
          <>
            <CancelButton onClick={() => onOpenChange(false)} />
            <PrimaryButton type="button" disabled={isSaving || !routePlan || nothingToAssign} onClick={() => void submit()}>
              {isSaving ? "Assigning..." : "Confirm & assign tasks"}
            </PrimaryButton>
          </>
        }
      >
        <dl className="m-0 flex flex-wrap items-center gap-x-6 gap-y-2 border bg-slate-50 px-4 py-3 text-xs">
          <div>
            <dt className={labelClass}>Transport plan</dt>
            <dd className="m-0 mt-0.5 font-semibold text-slate-900">{plan.planCode}</dd>
          </div>
          {routePlan ? (
            <div>
              <dt className={labelClass}>Route plan</dt>
              <dd className="m-0 mt-0.5">
                <RoutePlanStatusChip status={routePlan.status} />
              </dd>
            </div>
          ) : null}
          {dossier ? (
            <div>
              <dt className={labelClass}>Compliance dossier</dt>
              <dd className="m-0 mt-0.5">
                <ComplianceDossierChip status={dossier.status} />
              </dd>
            </div>
          ) : null}
        </dl>

        {!routePlan ? <InfoNote tone="warning">Route details are still loading. You can assign personnel once they are available.</InfoNote> : null}
        {nothingToAssign ? <InfoNote>Every internal segment already has personnel. Use “Change” on a segment to replace someone.</InfoNote> : null}

        <ol className="m-0 grid list-none gap-3 p-0">
          {rows.map((row) => {
            const index = pendingRows.findIndex((item) => item.routePlanRouteId === row.routePlanRouteId)
            const window = { from: row.plannedDepartureAt, to: row.plannedArrivalAt }
            const errors = index >= 0 ? form.formState.errors.segments?.[index] : undefined
            return (
              <li key={row.routePlanRouteId} className="border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-[#ef8f00] text-xs font-bold text-white">{row.sequenceNo}</span>
                  <h3 className="m-0 text-sm font-bold text-slate-900">
                    {row.fromName} → {row.toName}
                  </h3>
                  <SegmentTypeChip outsourced={row.isOutsourced} />
                  <span className="ml-auto">
                    <AssignmentStateChip state={segmentAssignmentState(row)} />
                  </span>
                </div>
                <p className="m-0 mt-1 text-[11px] text-slate-500">
                  {row.distanceKm !== null ? `${row.distanceKm} km · ` : ""}
                  {row.durationMinutes !== null ? `${formatDuration(row.durationMinutes)} · ` : ""}
                  {formatDateTime(row.plannedDepartureAt)} → {formatDateTime(row.plannedArrivalAt)}
                </p>
                {!row.isOutsourced && row.vehicles.length ? (
                  <p className="m-0 mt-1 text-[11px] text-slate-500">
                    Vehicles: {row.vehicles.map((vehicle) => [vehicle.vehicleCode, vehicle.licensePlate].filter(Boolean).join(" · ")).join(", ")}
                  </p>
                ) : null}

                {row.isOutsourced ? (
                  <div className="mt-3 flex items-center gap-3 border bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    <Truck className="size-4 shrink-0" aria-hidden="true" />
                    <span>
                      <strong>{row.provider?.providerCode} — {row.provider?.providerName}</strong>
                      <br />
                      Driver and escort are managed by the transport provider.
                    </span>
                  </div>
                ) : index >= 0 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <span className={labelClass}>Driver *</span>
                      <EmployeeSelect
                        role="DRIVER"
                        ariaLabel={`Driver for segment ${row.sequenceNo}`}
                        window={window}
                        transportPlanId={plan.transportPlanId}
                        segmentCountry={row.fromCountry}
                        placeholder="Select driver"
                        value={form.watch(`segments.${index}.driverEmployeeId`)}
                        invalid={Boolean(errors?.driverEmployeeId)}
                        disabled={isSaving}
                        onChange={(id, employee) => {
                          if (employee) picked.current.set(id, employee)
                          form.setValue(`segments.${index}.driverEmployeeId`, id, { shouldValidate: form.formState.isSubmitted, shouldDirty: true })
                        }}
                      />
                      {errors?.driverEmployeeId ? <p className="m-0 text-xs text-red-600">{errors.driverEmployeeId.message}</p> : null}
                    </div>
                    <div className="grid gap-1.5">
                      <span className={labelClass}>Escort *</span>
                      <EmployeeSelect
                        role="ESCORT"
                        ariaLabel={`Escort for segment ${row.sequenceNo}`}
                        window={window}
                        transportPlanId={plan.transportPlanId}
                        segmentCountry={row.fromCountry}
                        placeholder="Select escort"
                        value={form.watch(`segments.${index}.escortEmployeeId`)}
                        invalid={Boolean(errors?.escortEmployeeId)}
                        disabled={isSaving}
                        onChange={(id, employee) => {
                          if (employee) picked.current.set(id, employee)
                          form.setValue(`segments.${index}.escortEmployeeId`, id, { shouldValidate: form.formState.isSubmitted, shouldDirty: true })
                        }}
                      />
                      {errors?.escortEmployeeId ? <p className="m-0 text-xs text-red-600">{errors.escortEmployeeId.message}</p> : null}
                    </div>
                  </div>
                ) : (
                  <p className="m-0 mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
                    <Chip tone="slate">Driver</Chip>
                    {row.driver ? `${row.driver.employeeCode} — ${row.driver.fullName}` : "—"}
                    <Chip tone="slate">Escort</Chip>
                    {row.escort ? `${row.escort.employeeCode} — ${row.escort.fullName}` : "—"}
                  </p>
                )}
              </li>
            )
          })}
        </ol>

        <InfoNote>All internal segments must have both a driver and an escort. The assigned people are notified after confirmation.</InfoNote>
      </PersonnelDialog>

      <ScheduleConflictDialog conflict={conflict} onClose={() => setConflict(null)} onChoose={chooseAlternative} />
    </>
  )
}
