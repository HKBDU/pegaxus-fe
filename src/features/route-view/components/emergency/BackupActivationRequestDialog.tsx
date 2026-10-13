import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { LoaderCircle, Send } from "lucide-react"
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { backupRequestDefaults, backupRequestFormSchema, buildBackupRequest, type BackupRequestValues } from "../../emergency-form"
import { useEmergencyMutation, type EmergencyContext } from "../../hooks/useEmergencyRoute"
import { getEmergencyError } from "../../services"
import type { RoutePlanDetail } from "../../types"
import { EmergencyChangeSummary } from "./EmergencyChangeSummary"
import { EmergencyFeedback } from "./EmergencyFeedback"

const controls = [
  { name: "reason", label: "Reason for Change", required: true, type: "textarea" },
  { name: "newEstimatedArrivalAt", label: "New Estimated Arrival", required: true, type: "datetime-local" },
  { name: "estimatedExtraCost", label: "Estimated Extra Cost", type: "number" },
  { name: "currency", label: "Currency", type: "text" },
  { name: "note", label: "Additional Note", type: "textarea" },
] as const

export function BackupActivationRequestDialog({ plan, context, onClose }: { plan: RoutePlanDetail; context: EmergencyContext; onClose: () => void }) {
  const form = useForm<BackupRequestValues>({ resolver: zodResolver(backupRequestFormSchema), mode: "onTouched", defaultValues: backupRequestDefaults })
  const attempt = useFormRequestAttemptGuard(form)
  const mutation = useEmergencyMutation("request", plan, context)
  const busy = mutation.isPending || attempt.isRunning || form.formState.isSubmitting
  const submit = form.handleSubmit(async values => {
    try {
      const result = await attempt.run(() => mutation.mutateAsync(buildBackupRequest(values)))
      if (!result.started) return
      toast.success("Request sent to Logistics Manager. Backup remains CONFIRMED until approved.")
      onClose()
    } catch (error) {
      const fields = error instanceof z.ZodError ? error.issues.map(issue => ({ field: String(issue.path[0]), message: issue.message })) : getEmergencyError(error).errors
      for (const field of fields) {
        const name = field.field.replace(/^./, letter => letter.toLowerCase())
        if (name in backupRequestDefaults) form.setError(name as keyof BackupRequestValues, { message: field.message })
      }
    }
  })
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent showCloseButton={!busy} className="motion-reduce:animate-none motion-reduce:transition-none flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-white p-0 shadow-md sm:max-w-xl" onInteractOutside={event => { if (busy) event.preventDefault() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(`emergency-request-${plan.routePlanId}`)?.focus() }}>
      <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 pr-12 text-left"><DialogTitle className="m-0! flex items-center gap-2 font-heading text-xl! leading-6! uppercase text-slate-900"><Send aria-hidden="true" className="size-4 shrink-0 text-primary" />Request Backup Activation</DialogTitle><DialogDescription>Send this prepared backup to Logistics Manager for approval.</DialogDescription></DialogHeader>
      <Form {...form}><form noValidate onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-3 overflow-y-auto px-4 py-3"><EmergencyChangeSummary plan={plan} title="Selected Backup" compact />
          <fieldset disabled={busy} className="grid items-start gap-x-4 gap-y-2 sm:grid-cols-2">
            {controls.map(control => <FormField key={control.name} control={form.control} name={control.name} render={({ field }) => <FormItem className={`min-w-0 content-start gap-1.5 ${control.type === "textarea" || control.name === "newEstimatedArrivalAt" ? "sm:col-span-2" : ""}`}>
              <FormLabel className="leading-4">{control.label}{"required" in control && control.required ? " *" : ""}</FormLabel><FormControl>
                {control.type === "textarea" ? <Textarea {...field} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none min-h-20" /> : <Input {...field} type={control.type} step="any" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" />}
              </FormControl><div className="min-h-5"><FormMessage role="alert" className="text-xs leading-5" /></div></FormItem>} />)}
          </fieldset>
          <p className="text-xs leading-5 text-slate-500">The route stays confirmed until approval. Extra cost is an estimate, not a charge. Enter the new arrival time in your local time zone.</p>
          <EmergencyFeedback error={mutation.error} latestUpdatedAt={plan.updatedAt} />
        </div>
        <DialogFooter className="shrink-0 border-t bg-slate-50 px-4 py-3"><Button type="button" variant="outline" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={busy || attempt.isBlocked}>{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="size-4" />}{busy ? "Sending…" : "Send Request"}</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>
}
