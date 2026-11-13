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
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/shared/constants/upload";
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
  file.size <= UPLOAD_MAX_BYTES;

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
      invoiceRequired: false,
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
          invoiceRequired: invoiceRequired ?? false,
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
      className="m-0 min-h-4 text-[11px] text-red-600"
      aria-live="polite"
    >
      {form.formState.errors[field]?.message}
    </p>
  );
  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="space-y-4 rounded-xs border border-[#e5e2d9] bg-white p-4 shadow-[0_1px_2px_rgb(23_25_28/0.035),0_5px_18px_rgb(63_49_27/0.025)]"
    >
      <fieldset
        disabled={busy || !allowed || uncertainResult}
        className="m-0 min-w-0 space-y-4 border-0 p-0"
      >
        <legend className="sr-only">New emergency cost request</legend>
        <h2 className="m-0 border-b border-[#eceae3] pb-2 text-sm font-semibold text-slate-800">Expense</h2>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <Label htmlFor={`${id}-category`} className="text-xs font-medium text-slate-600">Expense category <span className="text-red-600">*</span></Label>
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
                    className="h-10 w-full rounded-xs bg-white text-sm sm:h-9"
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
            <Label htmlFor={`${id}-amount`} className="text-xs font-medium text-slate-600">Requested amount (VND) <span className="text-red-600">*</span></Label>
            <Input
              {...form.register("requestedAmount")}
              id={`${id}-amount`}
              inputMode="numeric"
              placeholder="15,000,000"
              className="h-10 rounded-xs bg-white text-sm tabular-nums sm:h-9"
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
        <h2 className="m-0 border-b border-[#eceae3] pb-2 pt-1 text-sm font-semibold text-slate-800">Details</h2>
        {(["description", "justification"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <Label htmlFor={`${id}-${field}`} className="text-xs font-medium text-slate-600">
              {field === "description"
                ? "Expense description and supplier"
                : "Justification and urgency"} <span className="text-red-600">*</span>
            </Label>
            <Textarea
              {...form.register(field)}
              id={`${id}-${field}`}
              rows={3}
              maxLength={2000}
              // The shared textarea grows with its content: cap it and scroll inside instead.
              className="max-h-32 min-h-20 resize-none overflow-y-auto rounded-xs bg-white text-sm"
              aria-invalid={Boolean(form.formState.errors[field])}
              aria-describedby={`${id}-${field}-error`}
            />
            {message(field)}
          </div>
        ))}
        <div className="space-y-1">
          <Controller
            control={form.control}
            name="invoiceRequired"
            render={({ field }) => (
              <div className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={`${id}-vat`}
                  checked={field.value ?? false}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={busy || !allowed || uncertainResult}
                />
                <Label htmlFor={`${id}-vat`} className="text-sm font-medium text-slate-800">VAT invoice required</Label>
              </div>
            )}
          />
          <p className="m-0 text-xs text-muted-foreground">
            Request a VAT invoice for this expense. This does not create or pay
            an invoice.
          </p>
        </div>
        <section
          aria-label="Supporting evidence"
          className="space-y-2"
        >
          <h2 className="m-0 border-b border-[#eceae3] pb-2 pt-1 text-sm font-semibold text-slate-800">
            Supporting evidence{" "}
            <span className="text-xs font-normal text-slate-500">
              Optional · up to 5 JPG/PNG · {UPLOAD_MAX_MB} MiB each
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
                Uploads use real storage. Only upload supporting images in an
                approved environment.
              </p>
              <FileUploader
                ref={uploader}
                entity="attachment"
                accept="image/jpeg,image/png"
                maxSize={UPLOAD_MAX_BYTES}
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
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#eceae3] pt-4">
        <Button
          type="button"
          variant="outline"
          asChild
          disabled={busy}
          className="h-10 rounded-xs sm:h-9"
        >
          <Link
            to={back}
            target={uncertainResult ? "_blank" : undefined}
            rel={uncertainResult ? "noreferrer" : undefined}
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
          >
            {uncertainResult ? "Check requests in a new tab" : "Cancel"}
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
          className="h-10 rounded-xs sm:h-9"
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
