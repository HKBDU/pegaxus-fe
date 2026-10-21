import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import FileUploader, {
  type FileUploaderHandle,
  type FileUploaderSnapshot,
} from "@/shared/components/FileUploader";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
import { useCreateEmergencyCost } from "../hooks/useCreateEmergencyCost";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import {
  emergencyCostDetailPath,
  emergencyCostScopedListPath,
  type EmergencyCostAudience,
} from "../navigation";
import {
  emergencyCostCategories,
  emergencyCostFormSchema,
  type EmergencyCostIncident,
} from "../schemas";
import {
  canCreateEmergencyCosts,
  emergencyCostAuthScope,
  getEmergencyCostError,
} from "../services";
import { isEmergencyCostMockMode } from "../source";
import type { MockCostEvidence } from "../mocks/repository";
import { MockCostPhotoPicker } from "./EmergencyCostEvidence";

type Values = z.input<typeof emergencyCostFormSchema>;
type ParsedValues = z.output<typeof emergencyCostFormSchema>;
const validPhoto = (file: File) =>
  ["image/jpeg", "image/png"].includes(file.type) &&
  file.size > 0 &&
  file.size <= 5 * 1024 * 1024;

function completedPhotos(snapshot: FileUploaderSnapshot | null) {
  if (!snapshot) return [];
  if (
    snapshot.items.length > 5 ||
    snapshot.items.some(
      (item) =>
        item.status !== "success" ||
        !item.publicId?.trim() ||
        !validPhoto(item.file),
    )
  )
    return null;
  return snapshot.items.map((item) => ({ publicId: item.publicId!.trim() }));
}

export function EmergencyCostForm({
  incident,
  audience,
  contextUnavailable,
}: {
  incident: EmergencyCostIncident;
  audience: EmergencyCostAudience;
  contextUnavailable: boolean;
}) {
  const id = useId();
  const navigate = useNavigate();
  const { principal, scope } = useEmergencyCostScope();
  const mutation = useCreateEmergencyCost();
  const mock = isEmergencyCostMockMode();
  const uploader = useRef<FileUploaderHandle>(null);
  const [snapshot, setSnapshot] = useState<FileUploaderSnapshot | null>(null);
  const [mockPhotos, setMockPhotos] = useState<MockCostEvidence[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uncertainResult, setUncertainResult] = useState(false);
  const [submissionBlocked, setSubmissionBlocked] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const form = useForm<Values, unknown, ParsedValues>({
    resolver: zodResolver(emergencyCostFormSchema),
    mode: "onChange",
    defaultValues: {
      requestedAmount: "",
      description: "",
      justification: "",
      ...(mock ? { invoiceRequired: false } : {}),
    },
  });
  const allowed =
    canCreateEmergencyCosts(principal) &&
    !contextUnavailable &&
    ["REPORTED", "PENDING"].includes(incident.status) &&
    incident.transport.status === "IN_TRANSIT" &&
    incident.availableActions.includes("REQUEST_COST");
  const uploading = !mock && completedPhotos(snapshot) === null;
  const busy = mutation.isPending || form.formState.isSubmitting;
  const back = emergencyCostScopedListPath(audience, incident.incidentReportId);
  const error = mutation.isError
    ? getEmergencyCostError(mutation.error, "create")
    : null;
  const submit = form.handleSubmit(async (values) => {
    if (
      inFlight.current ||
      !allowed ||
      uncertainResult ||
      submissionBlocked ||
      emergencyCostAuthScope() !== scope
    )
      return;
    const files = mock
      ? mockPhotos.map((photo) => ({ publicId: photo.publicId }))
      : completedPhotos(uploader.current?.getSnapshot() ?? null);
    if (!files) {
      setUploadError(
        "Complete every selected upload, or remove failed/pending files before submitting.",
      );
      return;
    }
    if (!mock && snapshot?.items.length && !uploader.current) {
      setUploadError(
        "Upload state is unavailable. Reload the form before submitting.",
      );
      return;
    }
    inFlight.current = true;
    setUploadError("");
    try {
      const { invoiceRequired, ...fields } = values;
      const request = await mutation.mutateAsync({
        incidentReportId: incident.incidentReportId,
        request: {
          ...fields,
          ...(mock ? { invoiceRequired: invoiceRequired ?? false } : {}),
          ...(files.length ? { photoFiles: files } : {}),
        },
        ...(mock ? { mockEvidence: mockPhotos } : {}),
      });
      if (mounted.current && emergencyCostAuthScope() === scope)
        navigate(
          emergencyCostDetailPath(
            audience,
            request.emergencyCostRequestId,
            incident.incidentReportId,
          ),
        );
    } catch (caught) {
      if (mounted.current && emergencyCostAuthScope() === scope) {
        const result = getEmergencyCostError(caught, "create");
        if (result.outcomeUnknown) setUncertainResult(true);
        if (result.submissionBlocked) setSubmissionBlocked(true);
      }
    } finally {
      inFlight.current = false;
    }
  });
  const message = (field: keyof Values) => (
    <p
      id={`${id}-${field}-error`}
      className="m-0 min-h-5 text-xs text-destructive"
      aria-live="polite"
    >
      {form.formState.errors[field]?.message}
    </p>
  );
  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="space-y-4 rounded-xs border border-border bg-card p-4 sm:p-5"
    >
      <fieldset
        disabled={busy || !allowed || uncertainResult}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        <legend className="sr-only">New emergency cost request</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`${id}-category`}>Expense category *</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  disabled={busy || !allowed || uncertainResult}
                >
                  <SelectTrigger
                    id={`${id}-category`}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="min-h-11 w-full rounded-xs"
                    aria-invalid={Boolean(form.formState.errors.category)}
                    aria-describedby={`${id}-category-error`}
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {emergencyCostCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {EMERGENCY_COST_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {message("category")}
          </div>
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`${id}-amount`}>Requested amount (VND) *</Label>
            <Input
              {...form.register("requestedAmount")}
              id={`${id}-amount`}
              inputMode="numeric"
              placeholder="15,000,000"
              className="min-h-11 rounded-xs tabular-nums"
              aria-invalid={Boolean(form.formState.errors.requestedAmount)}
              aria-describedby={`${id}-requestedAmount-error`}
              onBlur={(event) => {
                void form.register("requestedAmount").onBlur(event);
                const parsed =
                  emergencyCostFormSchema.shape.requestedAmount.safeParse(
                    event.target.value,
                  );
                if (parsed.success)
                  form.setValue(
                    "requestedAmount",
                    parsed.data.toLocaleString("en-US"),
                    { shouldValidate: true },
                  );
              }}
            />
            {message("requestedAmount")}
          </div>
        </div>
        {(["description", "justification"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <Label htmlFor={`${id}-${field}`}>
              {field === "description"
                ? "Expense description and supplier"
                : "Justification and urgency"}{" "}
              *
            </Label>
            <Textarea
              {...form.register(field)}
              id={`${id}-${field}`}
              rows={3}
              className="min-h-24 rounded-xs text-base sm:text-sm"
              aria-invalid={Boolean(form.formState.errors[field])}
              aria-describedby={`${id}-${field}-error`}
            />
            {message(field)}
          </div>
        ))}
        {mock ? (
          <div className="space-y-1">
            <Controller
              control={form.control}
              name="invoiceRequired"
              render={({ field }) => (
                <div className="flex min-h-11 items-center gap-2">
                  <Checkbox
                    id={`${id}-vat`}
                    checked={field.value ?? false}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    disabled={busy || !allowed || uncertainResult}
                  />
                  <Label htmlFor={`${id}-vat`}>
                    VAT invoice required · mock only
                  </Label>
                </div>
              )}
            />
            <p className="m-0 text-xs text-muted-foreground">
              Local mock value only. Real backend DTO support and the screen
              default still require confirmation.
            </p>
          </div>
        ) : (
          <p className="m-0 text-xs text-muted-foreground">
            VAT invoice input is unavailable until the backend confirms its DTO.
            No invoice field or VAT text workaround is sent.
          </p>
        )}
        <section
          aria-label="Supporting evidence"
          className="space-y-2 border-t border-border pt-4"
        >
          <h2 className="m-0 text-base font-semibold">
            Supporting evidence{" "}
            <span className="text-sm font-normal text-muted-foreground">
              Optional · up to 5 JPG/PNG · 5 MB each
            </span>
          </h2>
          {mock ? (
            <MockCostPhotoPicker
              photos={mockPhotos}
              onChange={setMockPhotos}
              disabled={busy || !allowed || uncertainResult}
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Uploads use real storage. The current cost contract does not
                confirm persisted evidence in CO3; do not upload sensitive
                material to an unapproved environment.
              </p>
              <FileUploader
                ref={uploader}
                entity="attachment"
                accept="image/jpeg,image/png"
                maxSize={5 * 1024 * 1024}
                maxFiles={5}
                disabled={busy || !allowed || uncertainResult}
                onStateChange={setSnapshot}
                title="Add receipt or quotation images"
              />
              <p role="status" className="m-0 text-xs text-muted-foreground">
                {snapshot?.items.filter((item) => item.status === "success")
                  .length ?? 0}{" "}
                of {snapshot?.items.length ?? 0} selected photos confirmed.
                Pending or failed selections block submission.
              </p>
            </>
          )}
          {uploadError ? (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          ) : null}
        </section>
      </fieldset>
      {!allowed ? (
        <p role="alert" className="text-sm text-destructive">
          A current authorized REQUEST_COST context, active incident and
          IN_TRANSIT transport are required.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xs border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error.message}
        </p>
      ) : null}
      {submissionBlocked ? (
        <p className="text-sm text-muted-foreground">
          Submission is locked after this eligibility error. Reopen the form
          with fresh incident context before submitting again.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          asChild
          disabled={busy}
          className="min-h-11 rounded-xs"
        >
          <Link
            to={back}
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            {uncertainResult ? "Check request list" : "Cancel"}
          </Link>
        </Button>
        <Button
          type="submit"
          disabled={
            !allowed ||
            busy ||
            uploading ||
            !form.formState.isValid ||
            uncertainResult ||
            submissionBlocked
          }
          className="min-h-11 rounded-xs"
        >
          {busy
            ? "Submitting..."
            : mock
              ? "Create mock request"
              : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
