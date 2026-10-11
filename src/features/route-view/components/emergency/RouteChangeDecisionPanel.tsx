import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/shared/components/ui/alert-dialog"
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails"
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard"
import { useEmergencyMutation, type EmergencyContext } from "../../hooks/useEmergencyRoute"
import { useRoutePlanDetail } from "../../hooks/useRoutePlanDetail"
import { getRouteViewError } from "../../services"
import { ErrorState } from "@/shared/components/common"
import type { RoutePlanDetail } from "../../types"
import { EmergencyChangeSummary } from "./EmergencyChangeSummary"
import { EmergencyFeedback } from "./EmergencyFeedback"

const rejectionSchema = z.object({ note: z.string().trim().min(10, "Explain the rejection in at least 10 characters.") })

export function RouteChangeDecisionPanel({ plan, context, onBack }: { plan: RoutePlanDetail; context: EmergencyContext; onBack: () => void }) {
  const [baseline, setBaseline] = useState(plan.updatedAt)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const form = useForm({ resolver: zodResolver(rejectionSchema), mode: "onTouched", defaultValues: { note: "" } })
  const attempt = useFormRequestAttemptGuard(form)
  const mutation = useEmergencyMutation("decision", plan, context)
  const primary = useRoutePlanDetail(context.primaryRoute?.routePlanId ?? "", Boolean(context.primaryRoute))
  const comparisonError = primary.isError ? getRouteViewError(primary.error) : null
  const isReturn = plan.routeType === "RETURN"
  const busy = attempt.isRunning || mutation.isPending
  const versionChanged = baseline !== plan.updatedAt && !mutation.data
  const locked = busy || attempt.isBlocked || versionChanged || Boolean(mutation.data) || primary.isPending || Boolean(comparisonError) || !context.primaryRoute
  const canApprove = !isReturn || context.workspace.dossierStatus === "APPROVED"
  const reviewLatest = () => { setBaseline(plan.updatedAt); mutation.reset(); attempt.reset() }
  async function submit(decision: "APPROVE" | "REJECT", note?: string) {
    if (locked || (decision === "APPROVE" && !canApprove)) return
    try {
      const result = await attempt.run(() => mutation.mutateAsync({ lastUpdatedAt: baseline, decision, note }))
      if (!result.started) return
      setApproveOpen(false); setRejectOpen(false)
      const outcome = result.value
      toast.success(`Route change ${outcome.decision.toLowerCase()}d. Route status: ${outcome.status}.${outcome.complianceDossier ? ` Dossier: ${outcome.complianceDossier.status}.` : ""}`)
      onBack()
    } catch { setApproveOpen(false); setRejectOpen(false) }
  }
  return <section aria-label="Emergency route change decision" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Emergency Operations · Logistics Manager</p><h2 className="font-heading text-2xl uppercase">Review Route Change</h2></div><Button variant="outline" disabled={busy} onClick={onBack}>Back to Route Plan</Button></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      {comparisonError ? <ErrorState message={comparisonError.message} /> : primary.data ? <EmergencyChangeSummary plan={primary.data} title="Current Primary Route" /> : <Section title="Current Primary Route"><p className="text-xs text-slate-500">{context.primaryRoute ? "Loading route comparison…" : "No current primary route is available."}</p></Section>}
      <EmergencyChangeSummary plan={plan} title="Proposed Route" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Section title="Change Information"><p className="text-sm text-slate-600">{isReturn ? plan.routeNote || "Return reason is not available." : "The request reason, ETA and cost are delivered in the backend notification. RP3 does not expose a persisted request record."}</p>
        <p className="text-xs text-slate-500">Transport: {context.transportCode} · Booking: {plan.bookingCode}</p>
        {isReturn && <p className="text-xs text-slate-500">Compliance dossier: {context.workspace.dossierStatus ?? "Not available"}. Customer upload is not reopened by this workflow.</p>}
        <p className="text-xs text-slate-500">{isReturn ? "Approval keeps RETURN DRAFT and reopens the dossier. TS must complete documents and legal review before activation." : "Approval activates only this BACKUP. PRIMARY remains ACTIVE; the backend composes the effective journey using the replaced segment range."}</p>
      </Section>
      <Section title="Decision"><p className="text-sm text-slate-600">{isReturn ? "Approve return for legal preparation, or reject and cancel this return proposal." : "Approve activation, or reject without cancelling the prepared backup."}</p>
        {!canApprove && <p className="text-xs text-destructive">RETURN approval requires an APPROVED dossier.</p>}
        <Button disabled={locked || !canApprove} onClick={() => setApproveOpen(true)} className="w-full"><Check aria-hidden="true" className="size-4" />{isReturn ? "Approve Return" : "Approve Change"}</Button>
        <Button variant="outline" disabled={locked} onClick={() => setRejectOpen(true)} className="w-full text-destructive"><X aria-hidden="true" className="size-4" />Reject Change</Button>
      </Section>
    </div>
    {mutation.data && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">Decision: {mutation.data.decision} · Route status: {mutation.data.status}{mutation.data.complianceDossier ? ` · Dossier: ${mutation.data.complianceDossier.status}` : ""}.{isReturn && mutation.data.decision === "APPROVE" ? " Await TS document preparation and RP7 legal confirmation. The route is not activated." : ""}</div>}
    {versionChanged && !mutation.error && <div role="alert" className="space-y-2 rounded-md border bg-muted p-3 text-sm"><p>A newer route version is available. Review the comparison before confirming another decision. Your rejection note is retained.</p><Button variant="outline" onClick={reviewLatest}>Use Reviewed Version</Button></div>}
    <EmergencyFeedback key={mutation.submittedAt} error={mutation.error} latestUpdatedAt={plan.updatedAt} onReviewLatest={reviewLatest} />
    <AlertDialog open={approveOpen} onOpenChange={open => { if (!busy) setApproveOpen(open) }}><AlertDialogContent className="rounded-md"><AlertDialogHeader><AlertDialogTitle>{isReturn ? "Approve Emergency Return?" : "Activate Prepared Backup?"}</AlertDialogTitle>
      <AlertDialogDescription>{isReturn ? "Compliance dossier APPROVED → DRAFT. RETURN remains DRAFT until TS completes legal review. Customer upload is not reopened." : "BACKUP becomes ACTIVE. Only the indicated PRIMARY segments are replaced; the backend sends the required notifications."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button disabled={locked || !canApprove} onClick={() => void submit("APPROVE")}>{busy ? "Approving…" : isReturn ? "Approve Return" : "Approve Change"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={rejectOpen} onOpenChange={open => { if (!busy) setRejectOpen(open) }}><DialogContent showCloseButton={!busy} className="rounded-md" onInteractOutside={event => { if (busy) event.preventDefault() }} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}><DialogHeader><DialogTitle>Reject Route Change</DialogTitle><DialogDescription>{isReturn ? "This cancels the RETURN proposal." : "BACKUP remains CONFIRMED."} Explain why this proposal cannot be accepted.</DialogDescription></DialogHeader>
      <Form {...form}><form noValidate onSubmit={form.handleSubmit(values => submit("REJECT", values.note))} className="space-y-4"><FormField control={form.control} name="note" render={({ field }) => <FormItem><FormLabel>Rejection Reason *</FormLabel><FormControl><Textarea {...field} disabled={busy} className="min-h-28 rounded-md" /></FormControl><FormMessage /></FormItem>} />
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setRejectOpen(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={locked}>{busy ? "Rejecting…" : "Reject Change"}</Button></DialogFooter>
      </form></Form></DialogContent></Dialog>
  </section>
}
