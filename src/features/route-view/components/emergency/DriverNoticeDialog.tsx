import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { BellRing, CheckCircle2, LoaderCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard"
import { formatPlanDate } from "@/features/transport-plan/format"
import { useEmergencyMutation, type EmergencyContext } from "../../hooks/useEmergencyRoute"
import type { EmergencyResultMap, RoutePlanDetail } from "../../types"
import { EmergencyChangeSummary } from "./EmergencyChangeSummary"
import { EmergencyFeedback } from "./EmergencyFeedback"

export function DriverNoticeSuccess({ result }: { result: EmergencyResultMap["notice"] }) {
  return <section role="status" className="space-y-3 rounded-[2px] border border-emerald-200 bg-emerald-50 p-4">
    <p className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 aria-hidden="true" className="size-4" />Driver Notification Sent</p>
    <p className="text-xs text-slate-600">Sent at {formatPlanDate(result.sentAt)}. The route status is unchanged.</p>
    {result.notifiedDrivers.length ? <ul className="space-y-2 text-sm">{result.notifiedDrivers.map(driver => <li key={driver.employeeId}><span className="font-medium">{driver.fullName}</span>{driver.employeeCode ? <span className="ml-2 text-xs text-slate-500">{driver.employeeCode}</span> : null}</li>)}</ul> : <p className="text-xs text-slate-500">The backend returned no notified drivers.</p>}
  </section>
}

export function DriverNoticeDialog({ plan, context, onClose }: { plan: RoutePlanDetail; context: EmergencyContext; onClose: () => void }) {
  const form = useForm({ defaultValues: { message: "" } })
  const attempt = useFormRequestAttemptGuard(form)
  const mutation = useEmergencyMutation("notice", plan, context)
  const busy = attempt.isRunning || mutation.isPending || form.formState.isSubmitting
  const submit = form.handleSubmit(async values => {
    try {
      const result = await attempt.run(() => mutation.mutateAsync({ message: values.message.trim() || undefined }))
      if (result.started) toast.success("Driver notification sent.")
    } catch { /* The mutation error remains visible below; no success or status change is fabricated. */ }
  })
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent showCloseButton={!busy} className="flow3-ui motion-reduce:animate-none motion-reduce:transition-none flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-white p-0 shadow-md sm:max-w-xl" onInteractOutside={event => { if (busy) event.preventDefault() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); document.getElementById(`emergency-notice-${plan.routePlanId}`)?.focus() }}>
      <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 pr-12 text-left"><DialogTitle className="m-0! flex items-center gap-2 font-heading text-xl! leading-6! uppercase text-slate-900"><BellRing aria-hidden="true" className="size-4 shrink-0 text-primary" />Notify Driver</DialogTitle><DialogDescription>Send emergency return instructions to the assigned Driver(s).</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={submit} className="flex min-h-0 flex-col"><div className="min-h-0 space-y-3 overflow-y-auto px-4 py-3">
        {mutation.data ? <DriverNoticeSuccess result={mutation.data} /> : <>
          <EmergencyChangeSummary plan={plan} title={plan.status === "ACTIVE" ? "Active Return" : "Confirmed Return"} compact /><p className="text-xs leading-5 text-slate-500">Drivers currently responsible for this transport receive the notice. Confirmed recipients appear after sending.</p>
          <FormField control={form.control} name="message" render={({ field }) => <FormItem className="min-w-0 content-start gap-1.5"><FormLabel className="leading-4">Additional Message (optional)</FormLabel><FormControl><Textarea {...field} maxLength={4000} disabled={busy} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none min-h-24" /></FormControl><div className="min-h-5"><FormMessage role="alert" className="text-xs leading-5" /></div></FormItem>} />
          <EmergencyFeedback error={mutation.error} latestUpdatedAt={plan.updatedAt} />
        </>}
      </div><DialogFooter className="shrink-0 border-t bg-slate-50 px-4 py-3"><Button type="button" variant="outline" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={busy} onClick={onClose}>{mutation.data ? "Back to Route Plan" : "Cancel"}</Button>
        {!mutation.data && <Button type="submit" className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={busy || attempt.isBlocked}>{busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <BellRing aria-hidden="true" className="size-4" />}{busy ? "Sending…" : "Send Notification"}</Button>}
      </DialogFooter></form></Form>
    </DialogContent>
  </Dialog>
}
