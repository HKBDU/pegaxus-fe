import { todayUtc } from "@/shared/utils/datetime";
import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
const errorCategories = [
  [1, "Unclear image"],
  [2, "Expired"],
  [3, "Missing stamp"],
  [4, "Wrong page"],
  [5, "Metadata mismatch"],
  [6, "Other"],
] as const;

// BE DossierRequirementStatus: 2 = REQUESTED, 5 = REJECTED
const REQUIREMENT_STATUS_OPTIONS = [
  [2, "Requested"],
  [5, "Rejected"],
] as const;

// BE ComplianceDossierStatus: 2 = IN_PREPARATION (fixed default in rejection payload)
const DEFAULT_DOSSIER_STATUS_IN_PREPARATION = 2;
import { mapDocumentReviewError } from "../lib/document-review";
import { documentRequestFormSchema } from "../schemas";
import type {
  DocumentRequestFormValues,
  DocumentReviewError,
  DossierRequirement,
} from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { DossierFormMessage } from "./DossierFormMessage";

export function RejectDocumentDialog({
  requirement,
  documentName,
  versionNo,
  isPending,
  canReject,
  onCancel,
  onSubmit,
}: {
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
    defaultValues: {
      errorCategory: 1,
      rejectionNote: "",
      revisionDeadline: "",
      requirementStatus: 5,
      dossierStatus: DEFAULT_DOSSIER_STATUS_IN_PREPARATION,
    },
  });
  const pending = isPending || form.formState.isSubmitting;
  const close = () => {
    if (!pending) onCancel();
  };

  async function submit(values: DocumentRequestFormValues) {
    if (!canReject || isPending) return;
    setError(null);
    try {
      await onSubmit(values);
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      setError(mapped);
      if (mapped.code === "REQUEST_MESSAGE_TOO_SHORT")
        form.setError(
          "rejectionNote",
          { message: mapped.message },
          { shouldFocus: true },
        );
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
            <DialogTitle className="font-heading text-xl uppercase sm:text-2xl text-primary">
              Reject Document &amp; Create DocumentRequest
            </DialogTitle>
            <DossierStatusBadge status="REJECTED" />
          </div>
          <DialogDescription className="pt-1 text-sm text-slate-500">
            {documentName} · {requirement.horseName ?? "Trip-level"} · Version v
            {versionNo}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id={formId}
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
          >
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[2px] border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed"
            >
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <p>
                A DocumentReview with result <strong>REJECTED</strong> will be
                created and a DocumentRequest will be sent to the customer. The
                customer will be asked to correct or re-upload the document.
              </p>
            </div>
            {!canReject ? (
              <p role="alert" className="text-sm text-destructive">
                This version can no longer be reviewed. Refresh the dossier
                before continuing.
              </p>
            ) : null}
            <fieldset
              disabled={pending || !canReject}
              className="space-y-5 disabled:opacity-70"
            >
              <FormField
                control={form.control}
                name="errorCategory"
                render={({ field }) => (
                  <FormItem className="items-start sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="self-start leading-5 sm:min-h-9">
                      Error Category <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="min-w-0 space-y-2">
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                        disabled={pending || !canReject}
                      >
                        <FormControl>
                          <SelectTrigger
                            ref={field.ref}
                            onBlur={field.onBlur}
                            className="h-9 w-full rounded-[2px]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {errorCategories.map(([value, label]) => (
                            <SelectItem key={value} value={String(value)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Select the correction the customer needs to provide.
                      </FormDescription>
                      <DossierFormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rejectionNote"
                render={({ field }) => (
                  <FormItem className="items-start sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="self-start leading-5 sm:min-h-9">
                      Instructions for Customer{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="min-w-0 space-y-2">
                      <FormControl>
                        <Textarea
                          {...field}
                          maxLength={2000}
                          className="min-h-36 resize-y rounded-[2px]"
                          placeholder="Explain what is wrong and what must be corrected or re-uploaded."
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Provide at least 15 characters of detailed
                        customer-facing instructions.
                      </FormDescription>
                      <DossierFormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revisionDeadline"
                render={({ field }) => (
                  <FormItem className="items-start sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="self-start leading-5 sm:min-h-9">
                      Revision Deadline{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="min-w-0 space-y-2">
                      <FormControl>
                        <DatePicker
                          {...field}
                          disabled={pending || !canReject}
                          minDate={todayUtc()}
                          placeholder="Select deadline"
                          className="rounded-[2px]"
                        />
                      </FormControl>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <FormDescription className="text-xs">
                          Required deadline, today or later (UTC).
                        </FormDescription>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!field.value}
                          onClick={() => field.onChange("")}
                          className={`h-auto px-0 py-1 text-xs ${field.value ? "" : "invisible"}`}
                        >
                          Clear deadline
                        </Button>
                      </div>
                      <DossierFormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requirementStatus"
                render={({ field }) => (
                  <FormItem className="items-start sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="self-start leading-5 sm:min-h-9">
                      Requirement Status{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="min-w-0 space-y-2">
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                        disabled={pending || !canReject}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 w-full rounded-[2px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REQUIREMENT_STATUS_OPTIONS.map(([value, label]) => (
                            <SelectItem key={value} value={String(value)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Target status for this requirement after rejection.
                      </FormDescription>
                      <DossierFormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </fieldset>
            {error ? (
              <div
                role="alert"
                className="rounded-[2px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p>{error.message}</p>
                {error.backendMessage && (
                  <details className="mt-2 text-xs">
                    <summary>Technical details</summary>
                    <p className="mt-1 break-words">
                      {error.code}: {error.backendMessage}
                    </p>
                  </details>
                )}
              </div>
            ) : null}
          </form>
        </Form>
        <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
            className="rounded-[2px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={pending || !canReject || Boolean(error?.outcomeUnknown)}
            className="rounded-[2px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {pending ? "Submitting…" : "Submit DocumentRequest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
