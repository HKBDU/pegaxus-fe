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
      dossierStatus: 2,
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
            <DialogTitle className="font-heading text-xl uppercase sm:text-2xl">
              Reject Document &amp; Create DocumentRequest
            </DialogTitle>
            <DossierStatusBadge status="REJECTED" />
          </div>
          <DialogDescription className="pt-1 text-sm">
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
                  <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="sm:pt-2">
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
                            className="w-full rounded-[2px]"
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
                  <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="leading-relaxed sm:pt-2">
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
                  <FormItem className="sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-x-5">
                    <FormLabel className="sm:pt-2">
                      Revision Deadline *
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
                      {field.value ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange("")}
                          className="h-auto px-0 py-1 text-xs"
                        >
                          Clear deadline
                        </Button>
                      ) : null}
                      <FormDescription className="text-xs">
                        Required deadline, today or later (UTC).
                      </FormDescription>
                      <DossierFormMessage />
                    </div>
                  </FormItem>
                )}
              />
              {(["requirementStatus", "dossierStatus"] as const).map((name) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {name === "requirementStatus"
                          ? "Requirement Status"
                          : "Dossier Status"}
                      </FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger className="rounded-[2px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(name === "requirementStatus"
                            ? [
                                [2, "Requested"],
                                [5, "Rejected"],
                              ]
                            : [
                                [2, "In preparation"],
                                [7, "Rejected"],
                              ]
                          ).map(([value, label]) => (
                            <SelectItem key={value} value={String(value)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <DossierFormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </fieldset>
            {error ? (
              <div
                role="alert"
                className="rounded-[2px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p>{error.message}</p>
                <details className="mt-2 text-xs">
                  <summary>Technical details</summary>
                  {error.code}: {error.backendMessage}
                </details>
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
            disabled={pending || !canReject}
            className="rounded-[2px]"
          >
            {pending ? "Submitting…" : "Submit DocumentRequest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
