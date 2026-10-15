import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ChessKnight, FileText, Info, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { formatBookingDate } from "@/features/booking/utils";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";
import { canSendMissingDocumentReminder } from "../constants";
import { useMissingDocumentReminder, useMissingDossierRequirements } from "../hooks/useMissingDocumentReminder";
import { groupMissingDossierRequirements, mapMissingDocumentReminderError } from "../lib/missing-document-reminder";
import { formatDossierProgress } from "../lib/progress";
import { missingDocumentReminderSchema } from "../schemas";
import type { DocumentReviewError, DossierOverview, DossierRequirement, MissingDocumentReminderFormValues, MissingDocumentReminderInput } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

export function MissingReminderPreview({ dossier, selected, dueDate, note }: {
  dossier: DossierOverview;
  selected: readonly DossierRequirement[];
  dueDate?: string;
  note?: string;
}) {
  return (
    <aside className="min-w-0 space-y-4 lg:border-l lg:pl-5" aria-label="Reminder summary">
      <h3 className="flex items-center gap-2 font-heading text-base uppercase"><Mail className="size-4 text-primary" />Reminder Summary</h3>
      <section className="space-y-3 rounded-[2px] border border-border p-4 text-sm" aria-label="Reminder preview">
        <p className="text-xs leading-relaxed text-muted-foreground">This is a local summary, not the exact backend email template.</p>
        <p>Missing documents for {dossier.bookingCode}</p>
        <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed">
          {selected.map((item) => <li key={item.dossierRequirementId}>{item.requirementName}{item.horseId !== null ? ` — ${item.horseName ?? dossier.bookingSummary.horses.find((horse) => horse.horseId === item.horseId)?.horseName ?? "Horse-specific"}` : " — Trip-level"}</li>)}
        </ul>
        {!selected.length ? <p className="text-xs text-muted-foreground">Select requirements to preview this reminder.</p> : null}
        {dueDate ? <p className="text-xs"><strong>Due Date:</strong> {formatBookingDate(dueDate)}</p> : null}
        {note?.trim() ? <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{note.trim()}</p> : null}
      </section>
      <p className="flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-800"><Info className="mt-0.5 size-4 shrink-0" />This reminder requests submission of existing missing requirements. It does not create new requirements or complete them.</p>
    </aside>
  );
}

function ReminderForm({ dossier, role, requirements, initialRequirementId, isRefreshing, loadError, onRetry, onClose }: {
  dossier: DossierOverview;
  role: string | undefined;
  requirements: DossierRequirement[];
  initialRequirementId?: string | number;
  isRefreshing: boolean;
  loadError: unknown;
  onRetry: () => void;
  onClose: () => void;
}) {
  const formId = useId();
  const mutation = useMissingDocumentReminder();
  const [error, setError] = useState<DocumentReviewError | null>(null);
  const form = useForm<MissingDocumentReminderFormValues, unknown, MissingDocumentReminderInput>({
    resolver: zodResolver(missingDocumentReminderSchema),
    defaultValues: {
      requirementIds: requirements.filter((item) => initialRequirementId === undefined || item.dossierRequirementId === initialRequirementId).map((item) => item.dossierRequirementId),
      dueDate: "", note: "",
    },
  });
  const chosenIds = form.watch("requirementIds");
  const selected = requirements.filter((item) => chosenIds.includes(item.dossierRequirementId));
  const groups = groupMissingDossierRequirements(requirements, dossier.bookingSummary.horses);
  const eligible = canSendMissingDocumentReminder(role, dossier);
  const pending = mutation.isPending || form.formState.isSubmitting;
  const disabled = pending || isRefreshing || Boolean(loadError) || !eligible;
  const allSelected = requirements.length > 0 && selected.length === requirements.length;
  const close = () => { if (!pending) onClose(); };

  async function submit(values: MissingDocumentReminderInput) {
    if (disabled) return;
    // A refreshed D8 may remove a formerly missing selection. Never submit that stale ID.
    const reminder = missingDocumentReminderSchema.safeParse({ ...values, requirementIds: selected.map((item) => item.dossierRequirementId) });
    if (!reminder.success) { form.setError("requirementIds", { message: "Select at least one current missing requirement." }); return; }
    setError(null);
    try {
      const attempt = await mutation.sendReminder({ dossierId: String(dossier.complianceDossierId), reminder: reminder.data });
      if (!attempt.started) return;
      toast.success(attempt.value.message, { description: `${attempt.value.value.requirements.length} requirement(s) reminded.` });
      if (attempt.value.value.deliveryWarning) toast.warning(attempt.value.value.deliveryWarning);
      else if (!attempt.value.value.emailSent) toast.warning("Reminder saved, but email delivery failed. Do not send it again.");
      onClose();
    } catch (failure) {
      const mapped = mapMissingDocumentReminderError(failure, dossier.writeLockReason);
      setError(mapped);
      toast.error(mapped.message);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={!pending} onEscapeKeyDown={(event) => pending && event.preventDefault()} onPointerDownOutside={(event) => pending && event.preventDefault()}
        className="flex max-h-[92svh] w-[calc(100%_-_1.5rem)] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-[2px] bg-white p-0 sm:max-w-[1100px]">
        <DialogHeader className="shrink-0 px-5 py-5 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-3 pr-6 font-heading text-xl uppercase text-primary sm:text-2xl"><Mail className="size-5 shrink-0" />Request Missing Documents</DialogTitle>
          <DialogDescription>This reminder will notify the customer about outstanding dossier requirements.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={(event) => void form.handleSubmit(submit)(event)} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 sm:px-6">
            <dl className="grid gap-4 rounded-[2px] border border-border bg-slate-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {[["Booking", dossier.bookingCode], ["Compliance Dossier", dossier.dossierCode], ["Progress", `${formatDossierProgress(dossier.progressPercent)} · ${dossier.mandatorySatisfiedOrWaived} / ${dossier.mandatoryTotal} mandatory complete`]].map(([label, value]) => (
                <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-semibold leading-relaxed">{value}</dd></div>
              ))}
              <div><dt className="text-muted-foreground">Overall Status</dt><dd className="mt-1"><DossierStatusBadge status={dossier.status} /></dd></div>
            </dl>
            {!eligible ? <p role="alert" className="text-sm text-destructive">Document reminders are unavailable for your role or the current dossier state.</p> : null}
            {loadError ? <div role="alert" className="space-y-2 rounded-[2px] border border-destructive/20 bg-destructive/5 p-3 text-sm"><p>{mapMissingDocumentReminderError(loadError, dossier.writeLockReason).message}</p><Button type="button" variant="outline" size="sm" disabled={pending || isRefreshing} onClick={onRetry}>Retry loading all requirements</Button></div> : null}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-70">
                <FormField control={form.control} name="requirementIds" render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <FormLabel className="font-heading text-base uppercase">Missing Dossier Requirements</FormLabel>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                        <Checkbox checked={allSelected ? true : selected.length ? "indeterminate" : false} disabled={disabled || !requirements.length}
                          onCheckedChange={(checked) => field.onChange(checked === true ? requirements.map((item) => item.dossierRequirementId) : [])} />Select all ({requirements.length})
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">Select missing requirements across the entire dossier, not only the current table page.</p>
                    <div className="max-h-[40svh] overflow-y-auto rounded-[2px] border border-border">
                      {groups.map((group) => {
                        const Icon = group.key === "trip" ? FileText : ChessKnight;
                        return <section key={group.key} className="border-b border-border last:border-b-0">
                          <h4 className="flex items-center gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold"><Icon className="size-4 text-primary" />{group.title} ({group.items.length})</h4>
                          <div className="space-y-1 p-2">{group.items.map((item) => (
                            <label key={item.dossierRequirementId} className="flex cursor-pointer items-start gap-3 rounded-[2px] px-2 py-2 text-xs hover:bg-primary/5">
                              <Checkbox checked={chosenIds.includes(item.dossierRequirementId)} disabled={disabled} className="mt-0.5 shrink-0" onCheckedChange={(checked) => field.onChange(checked === true
                                ? [...new Set([...chosenIds, item.dossierRequirementId])]
                                : chosenIds.filter((id) => id !== item.dossierRequirementId))} />
                              <span className="min-w-0 flex-1 break-words">{item.requirementName}{!item.isMandatory ? <span className="block text-[11px] text-muted-foreground">Optional</span> : null}</span>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${item.status === "PENDING" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{item.status === "PENDING" ? "Missing" : "Requested"}</span>
                            </label>
                          ))}</div>
                        </section>;
                      })}
                      {!requirements.length ? <p className="p-4 text-sm text-muted-foreground">No missing requirements remain. Refresh the dossier to review current statuses.</p> : null}
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <section className="space-y-4" aria-label="Reminder details">
                  <h3 className="font-heading text-base uppercase">Reminder Details</h3>
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem><FormLabel>Due Date *</FormLabel>
                      <FormControl><DatePicker {...field} disabled={disabled} className="rounded-[2px]" minDate={new Date().toISOString().slice(0, 10)} placeholder="Submission deadline" /></FormControl>
                      {field.value ? <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => field.onChange("")} className="h-auto px-0 py-1 text-xs">Clear date</Button> : null}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="note" render={({ field }) => (
                    <FormItem><FormLabel>Additional Message <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Textarea {...field} maxLength={2000} className="min-h-28 resize-y rounded-[2px]" placeholder="Add instructions for the customer…" /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </section>
              </fieldset>
              <MissingReminderPreview dossier={dossier} selected={selected} dueDate={form.watch("dueDate")} note={form.watch("note")} />
            </div>
            {isRefreshing ? <p role="status" className="text-xs text-muted-foreground">Refreshing the complete missing requirements list…</p> : null}
            {error ? <div role="alert" className="rounded-[2px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><p>{error.message}</p><details className="mt-2 text-xs"><summary>Technical details</summary>{error.code}: {error.backendMessage}</details></div> : null}
          </form>
        </Form>
        <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:items-center sm:px-6">
          <span aria-live="polite" className="text-xs text-muted-foreground sm:mr-auto">{selected.length} requirement(s) selected</span>
          <Button type="button" variant="outline" className="rounded-[2px]" disabled={pending} onClick={close}>Cancel</Button>
          <Button type="submit" form={formId} className="rounded-[2px]" disabled={disabled || !selected.length}><Send className="size-4" />{pending ? "Sending…" : "Send Reminder"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestMissingDocumentsDialog({ dossier, role, initialRequirementId, onClose }: {
  dossier: DossierOverview;
  role: string | undefined;
  initialRequirementId?: string | number;
  onClose: () => void;
}) {
  const eligible = canSendMissingDocumentReminder(role, dossier);
  const query = useMissingDossierRequirements(String(dossier.complianceDossierId), eligible);
  if (query.data) return <ReminderForm dossier={dossier} role={role} requirements={query.data} initialRequirementId={initialRequirementId} isRefreshing={query.isFetching} loadError={query.error} onRetry={() => void query.refetch()} onClose={onClose} />;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[2px] bg-white">
        <DialogHeader><DialogTitle className="font-heading text-xl uppercase text-primary">Request Missing Documents</DialogTitle><DialogDescription>Load all eligible missing requirements before selecting this reminder.</DialogDescription></DialogHeader>
        {!eligible ? <p role="alert" className="text-sm text-destructive">Document reminders are unavailable for your role or the current dossier state.</p>
          : query.isError ? <div role="alert" className="space-y-3 text-sm"><p>{mapMissingDocumentReminderError(query.error, dossier.writeLockReason).message}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry</Button></div>
            : <p role="status" className="text-sm text-muted-foreground">Loading all missing requirements…</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
