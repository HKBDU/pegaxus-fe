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
    <DialogContent showCloseButton={!busy} className="flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 shadow-xl sm:max-w-xl" onInteractOutside={event => { if (busy) event.preventDefault() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(`emergency-request-${plan.routePlanId}`)?.focus() }}>
      <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-5 pr-12 text-left"><div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Send aria-hidden="true" className="size-5" /></div><DialogTitle className="font-heading text-2xl uppercase text-slate-900">Request Backup Activation</DialogTitle><DialogDescription>Send this prepared backup to Logistics Manager for approval.</DialogDescription></DialogHeader>
      <Form {...form}><form noValidate onSubmit={submit} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5"><EmergencyChangeSummary plan={plan} title="Selected Backup" compact />
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {controls.map(control => <FormField key={control.name} control={form.control} name={control.name} render={({ field }) => <FormItem className={control.type === "textarea" || control.name === "newEstimatedArrivalAt" ? "sm:col-span-2" : undefined}>
              <FormLabel>{control.label}{"required" in control && control.required ? " *" : ""}</FormLabel><FormControl>
                {control.type === "textarea" ? <Textarea {...field} className="min-h-20 rounded-md" /> : <Input {...field} type={control.type} step="any" className="rounded-md" />}
              </FormControl><FormMessage /></FormItem>} />)}
          </fieldset>
          <p className="text-xs leading-5 text-slate-500">The route stays confirmed until approval. Extra cost is an estimate, not a charge. Enter the new arrival time in your local time zone.</p>
          <EmergencyFeedback error={mutation.error} latestUpdatedAt={plan.updatedAt} />
        </div>
        <DialogFooter className="shrink-0 border-t bg-slate-50 px-6 py-4"><Button type="button" variant="outline" className="rounded-lg" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" className="rounded-lg" disabled={busy || attempt.isBlocked}>{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}{busy ? "Sending…" : "Send Request"}</Button></DialogFooter>
      </form></Form>
    </DialogContent>
  </Dialog>
}
