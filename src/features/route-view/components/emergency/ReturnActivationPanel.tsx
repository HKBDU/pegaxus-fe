import { useState } from "react"
import { toast } from "sonner"
import { Play } from "lucide-react"
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
  return <section aria-label="Emergency return activation" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Emergency Operations · Logistics Manager</p><h2 className="font-heading text-2xl uppercase">Activate Return Route</h2></div><Button variant="outline" disabled={busy} onClick={onBack}>Back to Route Plan</Button></div>
    <EmergencyChangeSummary plan={plan} title="Confirmed Return" />
    <Section title="Readiness"><ul className="space-y-2 text-sm"><li>Route legally confirmed: {plan.status === "CONFIRMED" ? "Yes" : plan.status}</li><li>Compliance dossier: {context.workspace.dossierStatus ?? "Not available"}</li><li>Transport: {context.workspace.transportStatus}</li></ul>{dossierBlocked && <p className="text-xs text-destructive">Complete the approved compliance workflow before activation.</p>}</Section>
    <Section title="Return Segment Assignments"><EmergencySegments segments={plan.segments} errors={mutation.error ? getEmergencyError(mutation.error).errors : []} />
      <p className="text-xs text-slate-500">Existing vehicles, providers, Driver and Escort are retained. Resource reassignment controls require the vehicle/provider owner's public selectors; they are not available in this checkout. No segment overrides are sent.</p>
    </Section>
    <Section title="Activation Impact"><p className="text-sm text-slate-600">RETURN becomes ACTIVE. The effective journey uses completed legs plus RETURN; untraveled PRIMARY legs cease to be effective. The backend notifies Customer and Coordinator. Transport remains IN_TRANSIT.</p>
      <div className="space-y-2"><Label htmlFor="return-activation-note">Activation Note (optional)</Label><Textarea id="return-activation-note" value={note} disabled={busy || Boolean(mutation.data)} onChange={event => { setNote(event.target.value); attempt.reset() }} className="min-h-20 rounded-md" /></div>
    </Section>
    {mutation.data && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">Return activated. Backend route status: {mutation.data.status}.</p>}
    {versionChanged && !mutation.error && <div role="alert" className="space-y-2 rounded-md border bg-muted p-3 text-sm"><p>The route version changed. Review the current segments before activation. Your note is retained.</p><Button variant="outline" onClick={reviewLatest}>Use Reviewed Version</Button></div>}
    <EmergencyFeedback key={mutation.submittedAt} error={mutation.error} latestUpdatedAt={plan.updatedAt} onReviewLatest={reviewLatest} />
    <div className="flex justify-end border-t pt-4"><Button disabled={blocked} onClick={() => setConfirm(true)}><Play aria-hidden="true" className="size-4" />Activate Return</Button></div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open) }}><AlertDialogContent className="rounded-md"><AlertDialogHeader><AlertDialogTitle>Activate Emergency Return?</AlertDialogTitle><AlertDialogDescription>This applies the confirmed RETURN, keeps current resources and notifies Customer. Remaining untraveled PRIMARY legs are no longer part of the effective journey.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button disabled={blocked} onClick={() => void activate()}>{busy ? "Activating…" : "Activate Return"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
}
