import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, ClipboardCheck, Play, Truck } from "lucide-react"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel } from "@/shared/components/ui/alert-dialog"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { useEmergencyMutation, type EmergencyContext } from "../../hooks/useEmergencyRoute"
import { getEmergencyError } from "../../services"
import type { RoutePlanDetail } from "../../types"
import { EmergencyChangeSummary, EmergencySegments } from "./EmergencyChangeSummary"
import { EmergencyFeedback } from "./EmergencyFeedback"

export function ReturnActivationPanel({ plan, context, onBack }: { plan: RoutePlanDetail; context: EmergencyContext; onBack: () => void }) {
  const [baseline, setBaseline] = useState(plan.updatedAt)
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const mutation = useEmergencyMutation("activation", plan, context)
  const attempt = useRequestAttemptGuard()
  const busy = mutation.isPending || attempt.isRunning
  const noteError = mutation.error ? getEmergencyError(mutation.error).errors.find(error => error.field.toLowerCase() === "note")?.message : undefined
  const versionChanged = baseline !== plan.updatedAt && !mutation.data
  // RP7 is authoritative through CONFIRMED. Display dossier readiness only when actually read.
  const dossierBlocked = context.workspace.dossierStatus !== "APPROVED"
  const blocked = busy || attempt.isBlocked || versionChanged || dossierBlocked || Boolean(mutation.data)
  const reviewLatest = () => { setBaseline(plan.updatedAt); mutation.reset(); attempt.reset() }
  async function activate() {
    if (blocked) return
    try {
      const result = await attempt.run(() => mutation.mutateAsync({ lastUpdatedAt: baseline, note: note.trim() || undefined }))
      if (!result.started) return
      setConfirm(false)
      toast.success(`Return route status: ${result.value.status}. Existing assignments are retained.`)
      onBack()
    } catch { setConfirm(false) }
  }
  return <section aria-label="Emergency return activation" className="space-y-3">
    <div className="space-y-3"><Button variant="ghost" size="sm" disabled={busy} onClick={onBack} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none -ml-3 text-slate-600"><ArrowLeft aria-hidden="true" className="size-4" />Back to Route Plan</Button><div className="space-y-1.5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Emergency Operations · Logistics Manager</p><h1 tabIndex={-1} className="m-0! font-heading text-2xl! leading-7! uppercase text-slate-900 outline-none">Activate Return Route</h1><p className="text-sm text-slate-500">Check legal readiness and assigned resources for {plan.routePlanCode}.</p></div></div>
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]"><EmergencyChangeSummary plan={plan} title="Confirmed Return" proposed />
    <Section title="Readiness" icon={ClipboardCheck}><dl className="space-y-2 text-sm">{[
      { label: "Legal confirmation", value: plan.status }, { label: "Compliance dossier", value: context.workspace.dossierStatus }, { label: "Transport", value: context.workspace.transportStatus },
    ].map(item => <div key={item.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"><dt className="text-slate-500">{item.label}</dt><dd>{item.value ? <ApprovedBookingBadge value={item.value} /> : "Not available"}</dd></div>)}</dl>{dossierBlocked && <p className="text-xs text-destructive">Complete the approved compliance workflow before activation.</p>}</Section></div>
    <Section title="Return Segment Assignments" icon={Truck}><EmergencySegments segments={plan.segments} errors={mutation.error ? getEmergencyError(mutation.error).errors : []} />
      <p className="text-xs text-slate-500">Activation retains the listed vehicles, providers, Driver and Escort. Reassignment is not available here.</p>
    </Section>
    <Section title="Activation Details"><p className="text-sm leading-6 text-slate-600">The confirmed return replaces the remaining journey. Customer and Coordinator are notified; the transport stays in transit.</p>
      <div className="space-y-2"><Label htmlFor="return-activation-note">Activation Note (optional)</Label><Textarea id="return-activation-note" aria-invalid={Boolean(noteError)} aria-describedby={noteError ? "return-activation-note-error" : undefined} maxLength={4000} value={note} disabled={busy || Boolean(mutation.data)} onChange={event => { setNote(event.target.value); attempt.reset() }} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none min-h-20" /><div className="min-h-5">{noteError && <p id="return-activation-note-error" role="alert" className="text-xs leading-5 text-destructive">{noteError}</p>}</div></div>
    </Section>
    {mutation.data && <p role="status" className="rounded-[2px] border border-emerald-200 bg-emerald-50 p-4 text-sm">Return activated. Backend route status: {mutation.data.status}.</p>}
    {versionChanged && !mutation.error && <div role="alert" className="space-y-2 rounded-[2px] border bg-muted p-3 text-sm"><p>The route version changed. Review the current segments before activation. Your note is retained.</p><Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" variant="outline" onClick={reviewLatest}>Use Reviewed Version</Button></div>}
    <EmergencyFeedback key={mutation.submittedAt} error={mutation.error} latestUpdatedAt={plan.updatedAt} onReviewLatest={reviewLatest} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white p-3 shadow-none"><Button variant="outline" disabled={busy} onClick={onBack} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none">Cancel</Button><Button disabled={blocked} onClick={() => setConfirm(true)} className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"><Play aria-hidden="true" className="size-4" />Activate Return</Button></div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open) }}><AlertDialogContent className="flow3-ui motion-reduce:animate-none motion-reduce:transition-none rounded-[2px]"><AlertDialogHeader><AlertDialogTitle>Activate Emergency Return?</AlertDialogTitle><AlertDialogDescription>This applies the confirmed RETURN, keeps current resources and notifies Customer. Remaining untraveled PRIMARY legs are no longer part of the effective journey.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={busy}>Cancel</AlertDialogCancel><Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" disabled={blocked} onClick={() => void activate()}>{busy ? "Activating…" : "Activate Return"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}
