import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { transportPlanDetail } from "@/app/route-config"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { useCreateTransportPlan, useUpdateTransportPlan } from "../hooks/useTransportPlans"
import { getApiErrorInfo } from "../services"
import { getTransportPlanError, isTransportPlanConcurrencyCode, isTransportPlanLockedCode, isTransportPlanDuplicateCode } from "../services"
import { buildCreatePlanInput, buildUpdatePlanInput, canEditTransportPlan, planToForm } from "../transport-plan.form"
import { transportPlanFormSchema, editTransportPlanFormSchema } from "../schemas"
import { emptyPlanForm } from "../constants"
import type { TransportPlanDetail, TransportPlanFormValues } from "../types"
import { Section } from "./ApprovedBookingDetails"
import { Flow3MockIndicator } from "./Flow3MockIndicator"

const controlClass = "h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none focus-visible:border-primary focus-visible:ring-primary/20"
const fields = [
  { name: "plannedStartAt", label: "Planned Start", type: "datetime-local" },
  { name: "plannedEndAt", label: "Planned End", type: "datetime-local" },
  { name: "estimatedDistanceKm", label: "Estimated Distance (km)", type: "number" },
  { name: "estimatedDurationMinutes", label: "Estimated Duration (minutes)", type: "number" },
] as const

export function TransportPlanMetadataForm({ bookingId, plan, cancelHref, reloadLatest, onDuplicate, onCancel, onCreated }: {
  bookingId: string; plan?: TransportPlanDetail; cancelHref: string
  reloadLatest?: () => Promise<TransportPlanDetail | undefined>; onDuplicate?: () => Promise<unknown>
  onCancel?: () => void; onCreated?: (plan: TransportPlanDetail) => void
}) {
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  // Background TP3 refreshes must never silently replace the version the manager edited.
  const [baseline, setBaseline] = useState(plan)
  const [problem, setProblem] = useState<{ code?: string | null; message: string } | null>(null)
  const [reloading, setReloading] = useState(false)
  const form = useForm<TransportPlanFormValues>({ resolver: zodResolver(plan ? editTransportPlanFormSchema : transportPlanFormSchema),
    mode: "onTouched", defaultValues: plan ? planToForm(plan) : emptyPlanForm })
  const attempt = useFormRequestAttemptGuard(form)
  const create = useCreateTransportPlan(bookingId)
  const update = useUpdateTransportPlan(plan?.transportPlanId ?? "")
  const isPending = create.isPending || update.isPending || attempt.isRunning || form.formState.isSubmitting || reloading
  const canWrite = baseline ? canEditTransportPlan(principal, baseline) : canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const blocked = !canWrite || isTransportPlanConcurrencyCode(problem?.code) || isTransportPlanLockedCode(problem?.code)
  const submit = form.handleSubmit(async (values) => {
    if (blocked) return
    setProblem(null)
    try {
      let result
      if (baseline) {
        const input = buildUpdatePlanInput(values, baseline)
        if (Object.keys(input).length === 1) { toast.info("No metadata changes to save."); return }
        result = await attempt.run(() => update.mutateAsync(input))
      } else {
        const input = buildCreatePlanInput(values)
        result = await attempt.run(() => create.mutateAsync(input))
      }
      if (!result.started) return
      toast.success(baseline ? "Transport plan updated successfully." : "Transport plan created successfully.")
      if (!baseline) onCreated?.(result.value)
      navigate(transportPlanDetail(result.value.transportPlanId), { replace: true })
    } catch (error) {
      const info = getApiErrorInfo(error)
      const errors = error instanceof z.ZodError ? error.issues.map((issue) => ({ field: String(issue.path[0]), message: issue.message })) : info.errors
      for (const item of errors) {
        const name = item.field.replace(/^./, (letter) => letter.toLowerCase())
        if (Object.hasOwn(emptyPlanForm, name)) form.setError(name as keyof TransportPlanFormValues, { type: "server", message: item.message })
      }
      setProblem({ code: info.code, message: error instanceof z.ZodError ? "Check the highlighted fields and try again." : getTransportPlanError(error).message })
      if (isTransportPlanDuplicateCode(info.code)) {
        try { await onDuplicate?.() } catch { /* Keep the original mutation error visible if the refresh fails. */ }
      }
    }
  })
  const reload = async () => {
    if (!reloadLatest || isPending) return
    setReloading(true)
    try {
      const latest = await reloadLatest()
      if (!latest) throw new Error("No transport plan returned")
      setBaseline(latest); form.reset(planToForm(latest)); setProblem(null); attempt.reset()
    } catch (error) { setProblem({ code: "TRANSPORT_PLAN_MODIFIED", message: getTransportPlanError(error).message }) }
    finally { setReloading(false) }
  }
  return <Form {...form}><form noValidate onSubmit={submit} className="space-y-5">
    <Flow3MockIndicator />
    <Section title="Transport Plan Metadata">
      <p className="text-xs text-slate-500">Dates use your local time zone and are submitted in UTC. Leave optional numeric fields blank to omit them{baseline ? " and retain existing values" : ""}.</p>
      <fieldset disabled={isPending || !canWrite} className="grid gap-5 sm:grid-cols-2">
        {fields.map(({ name, label, type }) => <FormField key={name} control={form.control} name={name} render={({ field }) =>
          <FormItem><FormLabel className="font-heading text-xs uppercase">{label}{type === "datetime-local" && !baseline ? " *" : ""}</FormLabel>
            <FormControl><Input {...field} type={type} step={name === "estimatedDurationMinutes" ? "1" : "any"} min={type === "number" ? "0" : undefined} className={controlClass} /></FormControl><FormMessage /></FormItem>} />)}
        <FormField control={form.control} name="planningNote" render={({ field }) => <FormItem className="sm:col-span-2">
          <FormLabel className="font-heading text-xs uppercase">Planning Note</FormLabel><FormControl><Textarea {...field} className="min-h-24 rounded-[2px] border-slate-300 text-xs shadow-none" /></FormControl><FormMessage /></FormItem>} />
        {baseline ? <FormField control={form.control} name="updateReason" render={({ field }) => <FormItem className="sm:col-span-2">
          <FormLabel className="font-heading text-xs uppercase">Update Reason</FormLabel><FormControl><Input {...field} className={controlClass} /></FormControl><FormMessage /></FormItem>} /> : null}
      </fieldset>
    </Section>
    {problem ? <div role="alert" className="space-y-3 rounded-[2px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{problem.message}</p>
      {isTransportPlanConcurrencyCode(problem.code) && reloadLatest ? <><p className="text-xs">Reloading replaces your unsaved changes with the latest server data.</p><Button type="button" variant="outline" disabled={isPending} onClick={() => void reload()}>Reload Latest Data</Button></> : null}
    </div> : null}
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={isPending} className="rounded-[2px] bg-white" onClick={() => onCancel ? onCancel() : navigate(cancelHref)}>Cancel</Button>
      <Button type="submit" disabled={isPending || blocked || attempt.isBlocked || (Boolean(baseline) && !form.formState.isDirty)} className="rounded-[2px]">{isPending ? "Saving..." : baseline ? "Save Changes" : "Save Transport Plan"}</Button></div>
  </form></Form>
}
