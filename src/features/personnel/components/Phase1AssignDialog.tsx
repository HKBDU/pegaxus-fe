import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { REASON_MAX } from "@/features/personnel/constants"
import { useAssignPhase1, useChangePhase1, useReloadAssignments } from "@/features/personnel/hooks"
import { buildPhase1Schema, type Phase1FormValues } from "@/features/personnel/schemas"
import type { EmployeeBrief, Phase1Assignment, TransportPlanSummary } from "@/features/personnel/types"
import { getPersonnelErrorCode, getPersonnelErrorMessage, STALE_ERROR_CODES } from "@/features/personnel/utils"
import { CancelButton, InfoNote, PersonnelDialog, PrimaryButton } from "@/features/personnel/components/PersonnelDialog"
import { EmployeeCard, EmployeeSelect, labelClass, PlanSummaryStrip } from "@/features/personnel/components/PersonnelUi"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

interface Phase1AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "assign" = first assignment (PS1), "change" = replace TS and/or RC (PS5, reason required). */
  mode: "assign" | "change"
  plan: TransportPlanSummary
  phase1: Phase1Assignment
}

/** Logistics Manager picks the Transport Specialist and the Route Coordinator. */
export function Phase1AssignDialog({ open, onOpenChange, mode, plan, phase1 }: Phase1AssignDialogProps) {
  const transportPlanId = plan.transportPlanId
  const assign = useAssignPhase1(transportPlanId)
  const change = useChangePhase1(transportPlanId)
  const reload = useReloadAssignments(transportPlanId)
  const attempt = useRequestAttemptGuard()
  const isChange = mode === "change"
  const current = { transportSpecialistId: phase1.transportSpecialist?.employeeId, routeCoordinatorId: phase1.routeCoordinator?.employeeId }
  const schema = useMemo(() => buildPhase1Schema(mode, current), [mode, current.transportSpecialistId, current.routeCoordinatorId]) // eslint-disable-line react-hooks/exhaustive-deps
  const form = useForm<Phase1FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { transportSpecialistId: "", routeCoordinatorId: "", reason: "" },
  })
  const isSaving = assign.isPending || change.isPending
  // People picked in the dropdowns, kept to render their card (avatar, code, name, role) under each select.
  const [picked, setPicked] = useState<{ ts?: EmployeeBrief; rc?: EmployeeBrief }>({})
  const selectedTsId = form.watch("transportSpecialistId")
  const selectedRcId = form.watch("routeCoordinatorId")
  const selectedTs = phase1.transportSpecialist?.employeeId === selectedTsId ? phase1.transportSpecialist : picked.ts
  const selectedRc = phase1.routeCoordinator?.employeeId === selectedRcId ? phase1.routeCoordinator : picked.rc

  useEffect(() => {
    if (open) {
      setPicked({})
      form.reset({
        transportSpecialistId: isChange ? (current.transportSpecialistId ?? "") : "",
        routeCoordinatorId: isChange ? (current.routeCoordinatorId ?? "") : "",
        reason: "",
      })
      attempt.reset()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    try {
      const guarded = await attempt.run(async () => {
        if (!isChange) {
          await assign.mutateAsync({ transportSpecialistId: values.transportSpecialistId, routeCoordinatorId: values.routeCoordinatorId })
          return
        }
        // PS5: an omitted id keeps the current person, so only the people that actually changed are sent.
        await change.mutateAsync({
          lastUpdatedAt: plan.updatedAt,
          ...(values.transportSpecialistId && values.transportSpecialistId !== current.transportSpecialistId
            ? { transportSpecialistId: values.transportSpecialistId }
            : {}),
          ...(values.routeCoordinatorId && values.routeCoordinatorId !== current.routeCoordinatorId ? { routeCoordinatorId: values.routeCoordinatorId } : {}),
          reason: values.reason.trim(),
        })
      })
      if (!guarded.started) return
      toast.success(isChange ? "Phase 1 personnel updated successfully." : "Phase 1 personnel assigned successfully.")
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      const code = getPersonnelErrorCode(error)
      toast.error(getPersonnelErrorMessage(error, "Unable to save the Phase 1 assignment."))
      if (STALE_ERROR_CODES.has(code)) {
        reload()
        onOpenChange(false)
      }
    }
  })

  return (
    <PersonnelDialog
      open={open}
      onOpenChange={(next) => !isSaving && onOpenChange(next)}
      title={isChange ? "Change Phase 1 personnel" : "Phase 1 assignment"}
      description="Assign the Transport Specialist and the Route Coordinator to start legal review and route planning for this transport plan."
      footer={
        <>
          <CancelButton onClick={() => onOpenChange(false)} />
          <PrimaryButton disabled={isSaving} onClick={() => void submit()} type="button">
            {isSaving ? "Saving..." : isChange ? "Confirm change" : "Confirm Phase 1 assignment"}
          </PrimaryButton>
        </>
      }
    >
      <PlanSummaryStrip plan={plan} wideRoute className="sm:grid-cols-3 lg:grid-cols-3" />
      <Form {...form}>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <fieldset disabled={isSaving} className="m-0 grid min-w-0 items-start gap-4 border-0 p-0 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="transportSpecialistId"
              render={({ field, fieldState }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Transport Specialist *</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      role="TRANSPORT_SPECIALIST"
                      ariaLabel="Transport Specialist"
                      value={field.value}
                      onChange={(id, employee) => {
                        setPicked((current) => ({ ...current, ts: employee }))
                        field.onChange(id)
                      }}
                      current={phase1.transportSpecialist}
                      placeholder="Select Transport Specialist"
                      invalid={Boolean(fieldState.error)}
                    />
                  </FormControl>
                  {field.value && selectedTs ? <EmployeeCard employee={selectedTs} /> : null}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="routeCoordinatorId"
              render={({ field, fieldState }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className={labelClass}>Route Coordinator *</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      role="FLEET_ROUTE_COORDINATOR"
                      ariaLabel="Route Coordinator"
                      value={field.value}
                      onChange={(id, employee) => {
                        setPicked((current) => ({ ...current, rc: employee }))
                        field.onChange(id)
                      }}
                      current={phase1.routeCoordinator}
                      placeholder="Select Route Coordinator"
                      invalid={Boolean(fieldState.error)}
                    />
                  </FormControl>
                  {field.value && selectedRc ? <EmployeeCard employee={selectedRc} /> : null}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            {isChange ? (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="gap-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className={labelClass}>Reason for change *</FormLabel>
                      <span className="text-[10px] text-slate-400">{field.value.length}/{REASON_MAX}</span>
                    </div>
                    <FormControl>
                      <Textarea {...field} rows={3} maxLength={REASON_MAX} placeholder="e.g. Previous coordinator is on leave" className="max-h-32 min-h-20 resize-none overflow-y-auto rounded-[2px] border-[#f3aa3b] bg-transparent px-3 py-2 text-xs shadow-none placeholder:text-[#6c6963] focus-visible:border-primary focus-visible:ring-primary/20" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            ) : null}
          </fieldset>
        </form>
      </Form>
      <InfoNote>
        {isChange
          ? "The previous and the new employees will both be notified. Phase 1 can only be changed until Phase 2 opens."
          : "The selected employees will be notified after confirmation."}
      </InfoNote>
    </PersonnelDialog>
  )
}
