import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { REASON_MAX } from "@/features/personnel/constants"
import { useChangeSegmentPersonnel, useReloadAssignments } from "@/features/personnel/hooks"
import { buildSegmentChangeSchema, type SegmentChangeFormValues } from "@/features/personnel/schemas"
import type { EmployeeBrief, RoutePlanSummary, ScheduleConflictDetails, TransportPlanSummary } from "@/features/personnel/types"
import {
  employeeLabel,
  findConflictCandidate,
  formatDateTime,
  getPersonnelErrorCode,
  getPersonnelErrorMessage,
  STALE_ERROR_CODES,
  type SegmentRow,
} from "@/features/personnel/utils"
import { CancelButton, InfoNote, PersonnelDialog, PrimaryButton } from "@/features/personnel/components/PersonnelDialog"
import { EmployeeAvatar, EmployeeSelect, labelClass } from "@/features/personnel/components/PersonnelUi"
import { ScheduleConflictDialog, type ScheduleConflict } from "@/features/personnel/components/ScheduleConflictDialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

interface ReplaceSegmentDialogProps {
  /** The dialog is open while a segment row is given. */
  row: SegmentRow | null
  onOpenChange: (open: boolean) => void
  plan: TransportPlanSummary
  routePlan: RoutePlanSummary | undefined
}

function PersonCard({ title, employee, tone }: { title: string; employee: EmployeeBrief | null | undefined; tone: "current" | "new" }) {
  return (
    <div className={tone === "new" ? "border border-emerald-200 bg-emerald-50 p-3" : "border bg-slate-50 p-3"}>
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</p>
      {employee ? (
        <div className="mt-1 flex items-center gap-3">
          <EmployeeAvatar employee={employee} />
          <div>
            <p className="m-0 font-mono text-[11px] text-slate-500">{employee.employeeCode}</p>
            <p className="m-0 text-sm font-bold text-slate-900">{employee.fullName}</p>
          </div>
        </div>
      ) : (
        <p className="m-0 mt-1 text-xs italic text-slate-400">Not assigned</p>
      )}
    </div>
  )
}

/** SCR-F3-018: replace the driver and/or the escort of one segment before it departs (PS4, reason required). */
export function ReplaceSegmentDialog({ row, onOpenChange, plan, routePlan }: ReplaceSegmentDialogProps) {
  const change = useChangeSegmentPersonnel(plan.transportPlanId)
  const reload = useReloadAssignments(plan.transportPlanId)
  const attempt = useRequestAttemptGuard()
  const [conflict, setConflict] = useState<(ScheduleConflict & { field: "driverEmployeeId" | "escortEmployeeId" }) | null>(null)
  const picked = useRef(new Map<string, EmployeeBrief>())
  const open = row !== null
  const schema = useMemo(
    () => buildSegmentChangeSchema({ driverEmployeeId: row?.driver?.employeeId, escortEmployeeId: row?.escort?.employeeId }),
    [row?.driver?.employeeId, row?.escort?.employeeId],
  )
  const form = useForm<SegmentChangeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { driverEmployeeId: "", escortEmployeeId: "", reason: "" },
  })
  const isSaving = change.isPending
  const values = form.watch()

  useEffect(() => {
    if (!row) return
    picked.current.clear()
    setConflict(null)
    attempt.reset()
    form.reset({ driverEmployeeId: "", escortEmployeeId: "", reason: "" })
  }, [row?.routePlanRouteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const window = row ? { from: row.plannedDepartureAt, to: row.plannedArrivalAt } : {}
  const newDriver = values.driverEmployeeId ? picked.current.get(values.driverEmployeeId) : undefined
  const newEscort = values.escortEmployeeId ? picked.current.get(values.escortEmployeeId) : undefined

  const submit = form.handleSubmit(async (formValues) => {
    if (!row || !routePlan) return
    try {
      const guarded = await attempt.run(() =>
        change.mutateAsync({
          routePlanId: routePlan.routePlanId,
          routePlanRouteId: row.routePlanRouteId,
          // PS4: an omitted id keeps the current person.
          payload: {
            lastUpdatedAt: routePlan.updatedAt,
            ...(formValues.driverEmployeeId && formValues.driverEmployeeId !== row.driver?.employeeId ? { driverEmployeeId: formValues.driverEmployeeId } : {}),
            ...(formValues.escortEmployeeId && formValues.escortEmployeeId !== row.escort?.employeeId ? { escortEmployeeId: formValues.escortEmployeeId } : {}),
            reason: formValues.reason.trim(),
          },
        }),
      )
      if (!guarded.started) return
      toast.success("Segment personnel updated successfully.")
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      const code = getPersonnelErrorCode(error)
      if (code === "SCHEDULE_CONFLICT") {
        const candidates = [
          ...(newDriver ? [{ routePlanRouteId: row.routePlanRouteId, role: "DRIVER" as const, employee: newDriver }] : []),
          ...(newEscort ? [{ routePlanRouteId: row.routePlanRouteId, role: "ESCORT" as const, employee: newEscort }] : []),
        ]
        const details = (error as { details?: ScheduleConflictDetails }).details
        const hit = findConflictCandidate((error as { backendMessage?: string }).backendMessage, candidates, details)
        if (hit) {
          setConflict({
            message: getPersonnelErrorMessage(error),
            role: hit.role,
            employee: hit.employee,
            segmentLabel: `Segment ${row.sequenceNo} — ${row.fromName} → ${row.toName}`,
            planCode: plan.planCode,
            details,
            window: { from: row.plannedDepartureAt, to: row.plannedArrivalAt },
            field: hit.role === "DRIVER" ? "driverEmployeeId" : "escortEmployeeId",
          })
          return
        }
      }
      toast.error(getPersonnelErrorMessage(error, "Unable to change this segment's personnel."))
      if (STALE_ERROR_CODES.has(code) || code === "SEGMENT_LOCKED") {
        reload()
        onOpenChange(false)
      }
    }
  })

  const chooseAlternative = (employee: EmployeeBrief) => {
    if (!conflict) return
    picked.current.set(employee.employeeId, employee)
    form.setValue(conflict.field, employee.employeeId, { shouldDirty: true })
    setConflict(null)
  }

  return (
    <>
      <PersonnelDialog
        open={open}
        onOpenChange={(next) => !isSaving && onOpenChange(next)}
        title="Change / replace personnel"
        code="SCR-F3-018"
        description="Replace the assigned driver and/or escort for this route segment."
        footer={
          <>
            <CancelButton onClick={() => onOpenChange(false)} />
            <PrimaryButton type="button" disabled={isSaving || !routePlan} onClick={() => void submit()}>
              {isSaving ? "Saving..." : "Confirm reassignment"}
            </PrimaryButton>
          </>
        }
      >
        {row ? (
          <>
            <div className="grid gap-1 border bg-slate-50 p-3 text-xs">
              <span className="text-slate-500">Transport plan {plan.planCode}</span>
              <span className="font-semibold text-slate-900">
                Segment {row.sequenceNo} — {row.fromName} → {row.toName}
              </span>
              <span className="text-slate-500">
                {formatDateTime(row.plannedDepartureAt)} → {formatDateTime(row.plannedArrivalAt)}
              </span>
            </div>

            <Form {...form}>
              <form onSubmit={submit} noValidate className="grid gap-4">
                <fieldset disabled={isSaving} className="m-0 grid min-w-0 gap-4 border-0 p-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-3">
                      <PersonCard title="Current driver" employee={row.driver} tone="current" />
                      <FormField
                        control={form.control}
                        name="driverEmployeeId"
                        render={({ field, fieldState }) => (
                          <FormItem className="gap-1.5">
                            <FormLabel className={labelClass}>New driver</FormLabel>
                            <FormControl>
                              <EmployeeSelect
                                role="DRIVER"
                                ariaLabel="New driver"
                                window={window}
                                transportPlanId={plan.transportPlanId}
                                segmentCountry={row.fromCountry}
                                value={field.value}
                                keepLabel="Keep current driver"
                                excludeIds={row.driver ? [row.driver.employeeId] : undefined}
                                placeholder="Keep current driver"
                                invalid={Boolean(fieldState.error)}
                                onChange={(id, employee) => {
                                  if (employee) picked.current.set(id, employee)
                                  field.onChange(id)
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-3">
                      <PersonCard title="Current escort" employee={row.escort} tone="current" />
                      <FormField
                        control={form.control}
                        name="escortEmployeeId"
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <FormLabel className={labelClass}>New escort</FormLabel>
                            <FormControl>
                              <EmployeeSelect
                                role="ESCORT"
                                ariaLabel="New escort"
                                window={window}
                                transportPlanId={plan.transportPlanId}
                                segmentCountry={row.fromCountry}
                                value={field.value}
                                keepLabel="Keep current escort"
                                excludeIds={row.escort ? [row.escort.employeeId] : undefined}
                                placeholder="Keep current escort"
                                onChange={(id, employee) => {
                                  if (employee) picked.current.set(id, employee)
                                  field.onChange(id)
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {newDriver || newEscort ? (
                    <div className="grid gap-2 border p-3" aria-label="Comparison of personnel">
                      <span className={labelClass}>Comparison</span>
                      {newDriver ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500">Driver</span>
                          <span className="font-semibold">{row.driver ? employeeLabel(row.driver) : "Not assigned"}</span>
                          <ArrowRight className="size-3.5 text-slate-400" aria-hidden="true" />
                          <span className="font-semibold text-emerald-700">{employeeLabel(newDriver)}</span>
                        </div>
                      ) : null}
                      {newEscort ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-500">Escort</span>
                          <span className="font-semibold">{row.escort ? employeeLabel(row.escort) : "Not assigned"}</span>
                          <ArrowRight className="size-3.5 text-slate-400" aria-hidden="true" />
                          <span className="font-semibold text-emerald-700">{employeeLabel(newEscort)}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="gap-1.5">
                        <div className="flex items-center justify-between">
                          <FormLabel className={labelClass}>Reason for replacement *</FormLabel>
                          <span className="text-[10px] text-slate-400">{field.value.length}/{REASON_MAX}</span>
                        </div>
                        <FormControl>
                          <Textarea {...field} rows={3} maxLength={REASON_MAX} placeholder="e.g. The assigned driver is sick" className="min-h-20 rounded-[2px] border-0 bg-[#f3f3f3] py-2 text-xs shadow-none" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </fieldset>
              </form>
            </Form>
            <InfoNote>The new and the previous assignees are notified after confirmation. A segment that has already departed cannot be changed.</InfoNote>
          </>
        ) : null}
      </PersonnelDialog>

      <ScheduleConflictDialog conflict={conflict} onClose={() => setConflict(null)} onChoose={chooseAlternative} />
    </>
  )
}
