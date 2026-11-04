import { useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Folder,
  History,
  Loader2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { normalizeRole } from "@/features/auth/access-control";
import { DossierStatusBadge } from "@/features/dossier/components/DossierStatusBadge";
import { Field } from "@/shared/components/Field";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { formatUtcDateTime, todayUtc } from "@/shared/utils/datetime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { formatFileSize, matchesAcceptedType } from "@/shared/components/file-uploader/utils";
import { cn } from "@/lib/utils";
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/shared/constants/upload";
import { presignedUpload } from "@/shared/utils/presigned";
import { useAuthoritySubmissionDetail, useUpdateAuthorityReview } from "../hooks";
import type { AuthorityDecision } from "../types";
import { AuthorityEvidencePreview } from "./AuthorityEvidencePreview";

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
function getDecisionFileError(file: File): string | null {
  if (!matchesAcceptedType(file, ACCEPTED_FILE_TYPES) || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return "Only PDF, JPG, JPEG and PNG files are accepted.";
  if (file.size === 0) return "Decision document must not be empty.";
  if (file.size > UPLOAD_MAX_BYTES) return `Decision document must be ${UPLOAD_MAX_MB} MiB or smaller.`;
  return null;
}

type Errors = Partial<
  Record<
    | "permitNumber"
    | "permitIssuedDate"
    | "permitExpiryDate"
    | "decisionFile"
    | "rejectionReason"
    | "informationRequested"
    | "revisionDueDate"
    | "decisionNote",
    string
  >
>;

interface Props {
  submissionId: string;
  dossierId: string;
  onUpdated?: () => void;
  defaultOpen?: boolean;
}

export function UpdateAuthorityReviewDialog({
  submissionId,
  dossierId,
  onUpdated,
  defaultOpen = false,
}: Props) {
  const checkboxId = useId();
  const roles = useAuthStore((state) => state.principal?.roles ?? []);
  const canUpdate = roles.some(
    (role) => normalizeRole(role) === "TRANSPORT_SPECIALIST",
  );

  const { data: submissionDetail, isPending: isDetailPending, isError: isDetailError, refetch: refetchDetail } = useAuthoritySubmissionDetail(dossierId, submissionId);
  const mutation = useUpdateAuthorityReview(submissionId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [decision, setDecision] = useState<AuthorityDecision>("APPROVED");
  const [permitNumber, setPermitNumber] = useState("");
  const [permitIssuedDate, setPermitIssuedDate] = useState("");
  const [permitExpiryDate, setPermitExpiryDate] = useState("");
  const [revisionDueDate, setRevisionDueDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [informationRequested, setInformationRequested] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [notifyStakeholders, setNotifyStakeholders] = useState(true);
  const [decisionFile, setDecisionFile] = useState<File | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");

  const clearError = (key: keyof Errors) =>
    setErrors((current) => ({ ...current, [key]: undefined }));

  const reset = () => {
    setDecision("APPROVED");
    setPermitNumber("");
    setPermitIssuedDate("");
    setPermitExpiryDate("");
    setRevisionDueDate("");
    setRejectionReason("");
    setInformationRequested("");
    setDecisionNote("");
    setNotifyStakeholders(true);
    setDecisionFile(undefined);
    setErrors({});
    setServerError("");
    mutation.reset();
  };

  const handleFile = (file: File) => {
    clearError("decisionFile");
    const fileError = getDecisionFileError(file);
    if (fileError) {
      setErrors((prev) => ({
        ...prev,
        decisionFile: fileError,
      }));
      return;
    }
    setDecisionFile(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target) e.target.value = "";
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setServerError("");

    const next: Errors = {};

    if (!decisionFile) {
      next.decisionFile = "Official authority decision document is required.";
    } else {
      const fileError = getDecisionFileError(decisionFile);
      if (fileError) next.decisionFile = fileError;
    }

    if (decision === "APPROVED") {
      if (!permitNumber.trim()) {
        next.permitNumber = "Permit / Approval Code is required.";
      } else if (permitNumber.trim().length > 100) {
        next.permitNumber = "Permit / Approval Code cannot exceed 100 characters.";
      }

      if (permitIssuedDate) {
        const issued = new Date(permitIssuedDate);
        const diffYears = Math.abs(issued.getUTCFullYear() - Number(todayUtc().slice(0, 4)));
        if (diffYears > VALIDATION_LIMITS.dateWindowYears) {
          next.permitIssuedDate = `Issue date must be within ${VALIDATION_LIMITS.dateWindowYears} years of today.`;
        }
      }

      if (permitExpiryDate) {
        const expiry = new Date(permitExpiryDate);
        const diffYears = Math.abs(expiry.getUTCFullYear() - Number(todayUtc().slice(0, 4)));
        if (diffYears > VALIDATION_LIMITS.dateWindowYears) {
          next.permitExpiryDate = `Expiry date must be within ${VALIDATION_LIMITS.dateWindowYears} years of today.`;
        } else if (permitIssuedDate && permitExpiryDate < permitIssuedDate) {
          next.permitExpiryDate = "Expiry Date must be on or after Issue Date.";
        }
      }
    } else if (decision === "REJECTED") {
      if (!rejectionReason.trim()) {
        next.rejectionReason = "Official Rejection Reason is required.";
      } else if (rejectionReason.length > VALIDATION_LIMITS.noteMaxLength) {
        next.rejectionReason = `Rejection reason cannot exceed ${VALIDATION_LIMITS.noteMaxLength} characters.`;
      }
    } else if (decision === "RETURNED") {
      if (!informationRequested.trim()) {
        next.informationRequested = "Information Requested description is required.";
      } else if (informationRequested.length > VALIDATION_LIMITS.noteMaxLength) {
        next.informationRequested = `Information Requested description cannot exceed ${VALIDATION_LIMITS.noteMaxLength} characters.`;
      }
      if (!revisionDueDate) {
        next.revisionDueDate = "Revision Due Date is required.";
      } else {
        const revision = new Date(revisionDueDate);
        const diffYears = Math.abs(revision.getUTCFullYear() - Number(todayUtc().slice(0, 4)));
        if (diffYears > VALIDATION_LIMITS.dateWindowYears) {
          next.revisionDueDate = `Revision due date must be within ${VALIDATION_LIMITS.dateWindowYears} years of today.`;
        }
      }
    }

    if (decisionNote.length > VALIDATION_LIMITS.noteMaxLength) {
      next.decisionNote = `Authority Note / Reason cannot exceed ${VALIDATION_LIMITS.noteMaxLength} characters.`;
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    try {
      const decisionFilePublicId = await presignedUpload.upload({
        file: decisionFile!,
        entity: "attachment",
      });
      await mutation.mutateAsync({
        decision,
        permitNumber: decision === "APPROVED" ? permitNumber.trim() : undefined,
        permitIssuedDate: decision === "APPROVED" ? permitIssuedDate : undefined,
        permitExpiryDate: decision === "APPROVED" ? permitExpiryDate : undefined,
        decisionFile: { publicId: decisionFilePublicId },
        rejectionReason: decision === "REJECTED" ? rejectionReason.trim() : undefined,
        decisionNote: decision === "RETURNED" ? informationRequested.trim() : decisionNote.trim(),
        revisionDueDate: decision === "RETURNED" ? revisionDueDate : undefined,
        notifyStakeholders,
      });

      toast.success("Authority review result updated successfully.");
      onUpdated?.();
      setOpen(false);
      reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update the authority review result.";
      setServerError(message);
      toast.error(message);
    }
  };

  const previewFiles = useMemo(
    () => (decisionFile ? [decisionFile] : []),
    [decisionFile],
  );

  if (!canUpdate) return null;

  if (isDetailPending) {
    return <Card className="p-6 text-sm text-slate-500">Loading authority submission details…</Card>;
  }

  if (isDetailError || !submissionDetail) {
    return <Card className="space-y-3 p-6 text-sm text-red-600">Unable to load authority submission details.<Button type="button" variant="outline" onClick={() => void refetchDetail()}>Retry</Button></Card>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          className="rounded-[2px] bg-[#f39200] font-semibold text-white hover:bg-[#d97f00]"
        >
          Update Authority Review Result
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-0 overflow-y-auto rounded-[2px] border-[#e5e2d9] p-4 sm:max-w-6xl sm:p-6">
        <DialogHeader className="gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5 shrink-0 text-[#f39200]" />
            <DialogTitle className="font-heading text-lg font-bold uppercase tracking-wide text-[#f39200]">
              UPDATE AUTHORITY REVIEW RESULT
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Record the official review result received from the government authority after dossier submission.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 items-start gap-6 pt-1 lg:grid-cols-12">
          {/* Left Column (60% Layout) */}
          <div className="space-y-6 lg:col-span-7">
            <form
              id="update-authority-review"
              onSubmit={submit}
              className="space-y-6"
            >
              {/* Block 1: Select Review Outcome */}
              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.55px] text-[#181818]">
                  1. Select Review Outcome *
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* APPROVED */}
                  <button
                    type="button"
                    onClick={() => {
                      setDecision("APPROVED");
                      clearError("rejectionReason");
                      clearError("revisionDueDate");
                    }}
                    className={cn(
                      "flex flex-col justify-between rounded-[2px] border p-3.5 text-left transition-all",
                      decision === "APPROVED"
                        ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                    aria-pressed={decision === "APPROVED"}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      <span className="text-xs font-bold uppercase text-emerald-700">
                        APPROVED
                      </span>
                    </div>
                    <span className="mt-1.5 block text-[10px] leading-snug text-slate-500">
                      Dossier has been approved by the authority.
                    </span>
                  </button>

                  {/* REJECTED */}
                  <button
                    type="button"
                    onClick={() => {
                      setDecision("REJECTED");
                      clearError("permitNumber");
                      clearError("permitIssuedDate");
                      clearError("permitExpiryDate");
                      clearError("revisionDueDate");
                    }}
                    className={cn(
                      "flex flex-col justify-between rounded-[2px] border p-3.5 text-left transition-all",
                      decision === "REJECTED"
                        ? "border-red-500 bg-red-50/50 ring-1 ring-red-500"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                    aria-pressed={decision === "REJECTED"}
                  >
                    <div className="flex items-center gap-1.5">
                      <XCircle className="size-4 shrink-0 text-red-600" />
                      <span className="text-xs font-bold uppercase text-red-700">
                        REJECTED
                      </span>
                    </div>
                    <span className="mt-1.5 block text-[10px] leading-snug text-slate-500">
                      Dossier has been rejected by the authority.
                    </span>
                  </button>

                  {/* ADDITIONAL INFO REQUIRED */}
                  <button
                    type="button"
                    onClick={() => {
                      setDecision("RETURNED");
                      clearError("permitNumber");
                      clearError("permitIssuedDate");
                      clearError("permitExpiryDate");
                    }}
                    className={cn(
                      "flex flex-col justify-between rounded-[2px] border p-3.5 text-left transition-all",
                      decision === "RETURNED"
                        ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                    aria-pressed={decision === "RETURNED"}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="size-4 shrink-0 text-amber-600" />
                      <span className="text-xs font-bold uppercase text-amber-800">
                        ADDITIONAL INFO REQUIRED
                      </span>
                    </div>
                    <span className="mt-1.5 block text-[10px] leading-snug text-slate-500">
                      Authority requests additional information.
                    </span>
                  </button>
                </div>
              </div>

              {/* Block 2: Official Permit / Approval Information (Dynamic) */}
              <div className="space-y-4">
                <span className="block text-[11px] font-bold uppercase tracking-[0.55px] text-[#181818]">
                  {decision === "APPROVED"
                    ? "2. Official Permit / Approval Information"
                    : decision === "REJECTED"
                      ? "2. Official Rejection Grounds"
                      : "2. Information Request Details"}
                </span>

                {decision === "APPROVED" && (
                  <div className="space-y-4">
                    <Field
                      label="PERMIT / APPROVAL CODE *"
                      error={errors.permitNumber}
                    >
                      <Input
                        className={cn(
                          "rounded-[2px] border-input focus-visible:border-[#f39200] focus-visible:ring-[#f39200]/20",
                          errors.permitNumber && "border-red-500 focus-visible:ring-red-500",
                        )}
                        value={permitNumber}
                        onChange={(event) => {
                          setPermitNumber(event.target.value);
                          clearError("permitNumber");
                        }}
                        placeholder="e.g. EU-PERMIT-2026-881, CHED-A, MRN or official approval code..."
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="ISSUE DATE *" error={errors.permitIssuedDate}>
                        <DatePicker
                          className={cn(
                            "rounded-[2px] border-input focus-visible:border-[#f39200]",
                            errors.permitIssuedDate && "border-red-500",
                          )}
                          placeholder="Select issue date"
                          displayFormat="dd MMM yyyy"
                          value={permitIssuedDate}
                          onChange={(value) => {
                            setPermitIssuedDate(value);
                            clearError("permitIssuedDate");
                          }}
                        />
                      </Field>
                      <Field label="EXPIRY DATE *" error={errors.permitExpiryDate}>
                        <DatePicker
                          className={cn(
                            "rounded-[2px] border-input focus-visible:border-[#f39200]",
                            errors.permitExpiryDate && "border-red-500",
                          )}
                          placeholder="Select expiry date"
                          displayFormat="dd MMM yyyy"
                          value={permitExpiryDate}
                          onChange={(value) => {
                            setPermitExpiryDate(value);
                            clearError("permitExpiryDate");
                          }}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {decision === "REJECTED" && (
                  <Field
                    label="OFFICIAL REJECTION REASON *"
                    error={errors.rejectionReason}
                  >
                    <Textarea
                      rows={3}
                      className={cn(
                        "rounded-[2px] border-input focus-visible:border-[#f39200] focus-visible:ring-[#f39200]/20",
                        errors.rejectionReason && "border-red-500 focus-visible:ring-red-500",
                      )}
                      value={rejectionReason}
                      onChange={(event) => {
                        setRejectionReason(event.target.value);
                        clearError("rejectionReason");
                      }}
                      placeholder="Enter official grounds or reason for rejection issued by authority..."
                    />
                  </Field>
                )}

                {decision === "RETURNED" && (
                  <div className="space-y-4">
                    <Field
                      label="INFORMATION REQUESTED *"
                      error={errors.informationRequested}
                    >
                      <Textarea
                        rows={3}
                        className={cn(
                          "rounded-[2px] border-input focus-visible:border-[#f39200] focus-visible:ring-[#f39200]/20",
                          errors.informationRequested && "border-red-500 focus-visible:ring-red-500",
                        )}
                        value={informationRequested}
                        onChange={(event) => {
                          setInformationRequested(event.target.value);
                          clearError("informationRequested");
                        }}
                        placeholder="Describe specific documents or items requested by authority for revision or addition..."
                      />
                    </Field>
                    <Field
                      label="REVISION DUE DATE *"
                      error={errors.revisionDueDate}
                    >
                      <DatePicker
                        className={cn(
                          "rounded-[2px] border-input focus-visible:border-[#f39200]",
                          errors.revisionDueDate && "border-red-500",
                        )}
                        placeholder="Select revision due date"
                        displayFormat="dd MMM yyyy"
                        value={revisionDueDate}
                        onChange={(value) => {
                          setRevisionDueDate(value);
                          clearError("revisionDueDate");
                        }}
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* Block 3: Attach Official Document */}
              <div>
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.55px] text-[#181818]">
                  3. Attach Official Document *
                </span>

                {decisionFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-[2px] border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="size-6 shrink-0 text-red-500" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {decisionFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatFileSize(decisionFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionFile(undefined);
                          clearError("decisionFile");
                        }}
                        className="rounded-[2px] p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500"
                        aria-label="Remove attached file"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <AuthorityEvidencePreview files={previewFiles} />
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-[2px] border border-dashed p-6 text-center transition-colors",
                      isDragging
                        ? "border-[#f39200] bg-orange-50/40"
                        : "border-slate-300 bg-slate-50/50 hover:border-[#f39200]",
                      errors.decisionFile && "border-red-500 bg-red-50/20",
                    )}
                  >
                    <UploadCloud className="mb-2 size-8 text-slate-400" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="pointer-events-none mb-2 rounded-[2px] border-slate-300 hover:border-[#f39200]"
                    >
                      + Upload File
                    </Button>
                    <p className="text-xs font-medium text-slate-600">
                      Or drag and drop file here
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                Accepted format: PDF, JPG, JPEG, PNG (Max {UPLOAD_MAX_MB} MiB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </div>
                )}

                {errors.decisionFile && (
                  <p
                    className="pt-1 text-[10px] leading-[15px] text-red-600"
                    role="alert"
                  >
                    {errors.decisionFile}
                  </p>
                )}
              </div>

              {/* Block 4: Additional Information */}
              <div className="space-y-4">
                <span className="block text-[11px] font-bold uppercase tracking-[0.55px] text-[#181818]">
                  4. Additional Information
                </span>

                <Field
                  label="AUTHORITY NOTES / REASON *"
                  characterCount={{ value: decisionNote.length, max: 500 }}
                  error={errors.decisionNote}
                >
                  <Textarea
                    rows={3}
                    maxLength={500}
                    className={cn(
                      "rounded-[2px] border-input focus-visible:border-[#f39200] focus-visible:ring-[#f39200]/20",
                      errors.decisionNote && "border-red-500 focus-visible:ring-red-500",
                    )}
                    value={decisionNote}
                    onChange={(event) => {
                      setDecisionNote(event.target.value);
                      clearError("decisionNote");
                    }}
                    placeholder="Internal review notes, validity scope of permit, or special transit instructions..."
                  />
                </Field>

                <div className="flex items-start gap-2.5 rounded-[2px] border border-slate-200/80 bg-slate-50 p-3">
                  <Checkbox
                    id={checkboxId}
                    className="mt-0.5 rounded-[2px] data-[state=checked]:border-[#f39200] data-[state=checked]:bg-[#f39200]"
                    checked={notifyStakeholders}
                    onCheckedChange={(checked) =>
                      setNotifyStakeholders(Boolean(checked))
                    }
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor={checkboxId}
                      className="cursor-pointer text-xs font-semibold text-slate-800"
                    >
                      Send notification to Logistics Manager and Fleet Coordinator
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Send email and in-app notification to trigger route planning (Flow 3) immediately upon approval.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column (40% Context & History) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Card 1: ComplianceDossier Information */}
            <Card className="gap-3 rounded-[2px] border border-[#e5e2d9] bg-white py-3.5 shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2">
                <div className="flex items-center gap-2">
                  <Folder className="size-4 text-[#f39200]" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-800">
                    ComplianceDossier Information
                  </span>
                </div>
                <DossierStatusBadge
                  status={
                    (submissionDetail?.dossierSummary?.status as
                      | "SUBMITTED"
                      | "APPROVED"
                      | "REJECTED"
                      | "IN_PREPARATION"
                      | "READY_FOR_SUBMISSION") || "SUBMITTED"
                  }
                />
              </div>
              <div className="space-y-2 px-4 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">CDos Code</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-900">
                    {submissionDetail?.dossierSummary?.cdosCode || "CDOS-20260925-1002"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Booking</span>
                  <span className="col-span-2 cursor-pointer font-medium text-[#f39200] hover:underline">
                    {submissionDetail?.dossierSummary?.bookingNo || "REQ-20260925-1002"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Route</span>
                  <span className="col-span-2 text-slate-800">
                    {submissionDetail?.dossierSummary
                      ? `${submissionDetail.dossierSummary.originCountry} → ${submissionDetail.dossierSummary.destinationCountry}`
                      : "London (UK) → Paris (FR)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Transport Date</span>
                  <span className="col-span-2 text-slate-800">
                    {submissionDetail?.dossierSummary?.departureDate || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Horses</span>
                  <span className="col-span-2 text-slate-800">
                    {submissionDetail?.dossierSummary?.horsesCount
                      ? `${submissionDetail.dossierSummary.horsesCount} horses`
                      : "2 horses"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Customer</span>
                  <span className="col-span-2 text-slate-800">
                    {submissionDetail?.dossierSummary?.customerName || "Greenwood Racing Ltd"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 2: Authority Submission Details */}
            <Card className="gap-3 rounded-[2px] border border-[#e5e2d9] bg-white py-3.5 shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[#f39200]" />
                  <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-800">
                    Authority Submission Details
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 rounded-[2px] px-2 text-[11px] font-semibold text-[#f39200] hover:bg-orange-50 hover:text-[#d97f00]"
                >
                  Edit
                </Button>
              </div>
              <div className="space-y-2 px-4 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Authority Portal</span>
                  <span className="col-span-2 flex items-center gap-1.5 font-medium text-slate-800">
                    <span>🇪🇺</span>
                    <span>{submissionDetail?.authorityName || "EU TRACES-NT"}</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Submission Reference</span>
                  <span className="col-span-2 font-mono font-medium text-slate-900">
                    {submissionDetail?.submissionReference || "CHEDA.GB.2026.109283"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Submitted At</span>
                  <span className="col-span-2 text-slate-800">
                    {submissionDetail?.submittedAt ? formatUtcDateTime(submissionDetail.submittedAt) : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-start gap-2">
                  <span className="font-medium text-slate-500">Evidence File</span>
                  <div className="col-span-2">
                    <div className="inline-flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 transition-colors hover:border-[#f39200] hover:text-[#f39200]">
                      <FileText className="size-3.5 shrink-0 text-red-500" />
                      <span className="max-w-[140px] truncate text-[11px] font-medium">
                        {submissionDetail?.evidenceFile?.fileName || "traces_submission_receipt.pdf"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (
                        {submissionDetail?.evidenceFile?.fileSize
                          ? formatFileSize(submissionDetail.evidenceFile.fileSize)
                          : "2.4 MB"}
                        )
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-medium text-slate-500">Notes</span>
                  <span className="col-span-2 text-[11px] italic text-slate-600">
                    {submissionDetail?.notes ||
                      "Submitted via TRACES-NT portal. All documents attached as required."}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 3: Review History (Timeline) */}
            <Card className="gap-3 rounded-[2px] border border-[#e5e2d9] bg-white py-3.5 shadow-none">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 pb-2">
                <History className="size-4 text-[#f39200]" />
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-800">
                  Review History
                </span>
              </div>
              <div className="px-4 py-2">
                <div className="relative border-l-2 border-slate-200 pl-4 space-y-5">
                  {/* Step 1: Submission */}
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 size-2.5 rounded-[2px] bg-blue-500 ring-4 ring-blue-100" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Dossier Submitted to Authority
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {submissionDetail?.submittedAt ? formatUtcDateTime(submissionDetail.submittedAt) : "—"} by{" "}
                        {submissionDetail?.submittedBy || "Nguyen Van A (TS)"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {submissionDetail?.authorityName || "EU TRACES-NT"} | Ref:{" "}
                        <span className="font-mono font-medium">
                          {submissionDetail?.submissionReference || "CHEDA.GB.2026.109283"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Current Outcome */}
                  <div className="relative">
                    <span
                      className={cn(
                        "absolute -left-[21px] top-1 size-2.5 rounded-[2px] ring-4",
                        decision === "APPROVED" && "bg-emerald-500 ring-emerald-100",
                        decision === "REJECTED" && "bg-red-500 ring-red-100",
                        decision === "RETURNED" && "bg-amber-500 ring-amber-100",
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          Authority Review Result:{" "}
                          <span
                            className={cn(
                              decision === "APPROVED" && "text-emerald-700",
                              decision === "REJECTED" && "text-red-700",
                              decision === "RETURNED" && "text-amber-700",
                            )}
                          >
                            {decision === "APPROVED"
                              ? "APPROVED"
                              : decision === "REJECTED"
                                ? "REJECTED"
                                : "ADDITIONAL INFO REQUIRED"}
                          </span>
                        </p>
                        <DossierStatusBadge
                          status={
                            decision === "APPROVED"
                              ? "APPROVED"
                              : decision === "REJECTED"
                                ? "REJECTED"
                                : "PENDING"
                          }
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Draft entry in progress by Transport Specialist
                      </p>

                      {decision === "APPROVED" && permitNumber && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          Permit: <span className="font-mono font-semibold">{permitNumber}</span>
                          {permitExpiryDate && ` | Valid until: ${permitExpiryDate}`}
                        </p>
                      )}

                      {decisionFile && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          File: <span className="font-medium">{decisionFile.name}</span> (
                          {formatFileSize(decisionFile.size)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
          <div className="flex min-w-0 items-center gap-2">
            {serverError && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle className="size-4 shrink-0" aria-label="Review error" />
                      <span className="truncate max-w-sm">{serverError}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-[2px]">{serverError}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
              className="rounded-[2px] border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="update-authority-review"
              className="rounded-[2px] bg-[#f39200] px-6 font-semibold text-white hover:bg-[#d97f00]"
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Save Review Result
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
