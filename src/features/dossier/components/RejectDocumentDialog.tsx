import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { DOCUMENT_REQUEST_TYPES, documentRequestTypeLabels } from "../constants";
import { mapDocumentReviewError } from "../lib/document-review";
import { documentRequestFormSchema } from "../schemas";
import type { DocumentRequestFormValues, DocumentReviewError, DossierRequirement } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

export function RejectDocumentDialog({ requirement, documentName, versionNo, isPending, canReject, onCancel, onSubmit }: {
  requirement: DossierRequirement;
  documentName: string;
  versionNo: number;
  isPending: boolean;
  canReject: boolean;
  onCancel: () => void;
  onSubmit: (values: DocumentRequestFormValues) => Promise<boolean>;
}) {
  const formId = useId();
  const [error, setError] = useState<DocumentReviewError | null>(null);
  const form = useForm<DocumentRequestFormValues>({
    resolver: zodResolver(documentRequestFormSchema),
    defaultValues: { requestType: "REUPLOAD", message: "", dueDate: "" },
  });
  const pending = isPending || form.formState.isSubmitting;
  const close = () => { if (!pending) onCancel(); };

  async function submit(values: DocumentRequestFormValues) {
    if (!canReject || isPending) return;
    setError(null);
    try {
      await onSubmit(values);
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      setError(mapped);
      if (mapped.code === "REQUEST_MESSAGE_TOO_SHORT") form.setError("message", { message: mapped.message }, { shouldFocus: true });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
        className="flex max-h-[90svh] w-[min(100%-1.5rem,800px)] max-w-none flex-col gap-0 overflow-hidden rounded-[2px] bg-white p-0 sm:max-w-none"
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 pr-6">
            <DialogTitle className="font-heading text-xl uppercase sm:text-2xl">Reject Document &amp; Create DocumentRequest</DialogTitle>
            <DossierStatusBadge status="REJECTED" />
          </div>
          <DialogDescription className="pt-1 text-sm">
            {documentName} · {requirement.horseName ?? "Trip-level"} · Version v{versionNo}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={(event) => void form.handleSubmit(submit)(event)} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div role="alert" className="flex items-start gap-3 rounded-[2px] border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>A DocumentReview with result <strong>REJECTED</strong> will be created and a DocumentRequest will be sent to the customer. The customer will be asked to correct or re-upload the document.</p>
            </div>
            {!canReject ? <p role="alert" className="text-sm text-destructive">This version can no longer be reviewed. Refresh the dossier before continuing.</p> : null}
            <fieldset disabled={pending || !canReject} className="space-y-5 disabled:opacity-70">
              <FormField control={form.control} name="requestType" render={({ field }) => (
                <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                  <FormLabel className="sm:pt-2">Request Type <span className="text-destructive">*</span></FormLabel>
                  <div className="min-w-0 space-y-2">
                    <Select value={field.value} onValueChange={field.onChange} disabled={pending || !canReject}>
                      <FormControl><SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full rounded-[2px]"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{DOCUMENT_REQUEST_TYPES.map((type) => <SelectItem key={type} value={type}>{documentRequestTypeLabels[type]}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormDescription className="text-xs">Select the correction the customer needs to provide.</FormDescription>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                  <FormLabel className="leading-relaxed sm:pt-2">Instructions for Customer <span className="text-destructive">*</span></FormLabel>
                  <div className="min-w-0 space-y-2">
                    <FormControl><Textarea {...field} className="min-h-36 resize-y rounded-[2px]" placeholder="Explain what is wrong and what must be corrected or re-uploaded." /></FormControl>
                    <FormDescription className="text-xs">Provide at least 15 characters of detailed customer-facing instructions.</FormDescription>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                  <FormLabel className="sm:pt-2">Revision Deadline</FormLabel>
                  <div className="min-w-0 space-y-2">
                    <FormControl><DatePicker {...field} disabled={pending || !canReject} placeholder="Optional deadline" className="rounded-[2px]" /></FormControl>
                    {field.value ? <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange("")} className="h-auto px-0 py-1 text-xs">Clear deadline</Button> : null}
                    <FormDescription className="text-xs">Optional date for the customer to submit their correction.</FormDescription>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )} />
            </fieldset>
            {error ? <div role="alert" className="rounded-[2px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><p>{error.message}</p><details className="mt-2 text-xs"><summary>Technical details</summary>{error.code}: {error.backendMessage}</details></div> : null}
          </form>
        </Form>
        <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" disabled={pending} onClick={close} className="rounded-[2px]">Cancel</Button>
          <Button type="submit" form={formId} disabled={pending || !canReject} className="rounded-[2px]">{pending ? "Submitting…" : "Submit DocumentRequest"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
