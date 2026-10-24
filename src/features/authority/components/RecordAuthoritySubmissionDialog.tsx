import { useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { normalizeRole } from "@/features/auth/access-control";
import FileUploader from "@/shared/components/FileUploader";
import { Field } from "@/shared/components/Field";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
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
import { VALIDATION_LIMITS } from "@/shared/constants/validation-limits";
import { useRecordAuthoritySubmission } from "../hooks";
import type { AuthoritySubmissionStatus } from "../types";
import { AuthorityEvidencePreview } from "./AuthorityEvidencePreview";

const ACCEPTED_PROOF_TYPES = "application/pdf,image/jpeg,image/png";
const MAX_PROOF_SIZE = 10 * 1024 * 1024;
type Errors = Partial<
  Record<
    | "authorityName"
    | "submissionReference"
    | "submissionDate"
    | "decisionNote"
    | "proofFiles"
    | "submissionMethod",
    string
  >
>;
const DialogDescription = (_props: { children?: unknown }) => null;

interface Props {
  dossierId: string;
  dossierStatus?: AuthoritySubmissionStatus | string | null;
  onRecorded?: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordAuthoritySubmissionDialog({
  dossierId,
  dossierStatus,
  onRecorded,
}: Props) {
  const roles = useAuthStore((state) => state.principal?.roles ?? []);
  const canSubmit = roles.some(
    (role) => normalizeRole(role) === "TRANSPORT_SPECIALIST",
  );
  const canRecord =
    !dossierStatus ||
    ["READY_FOR_SUBMISSION", "SUBMITTED", "PENDING"].includes(dossierStatus);
  const mutation = useRecordAuthoritySubmission(dossierId);
  const filesRef = useRef(new Map<string, File>());
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [authorityName, setAuthorityName] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");
  const [submissionMethod, setSubmissionMethod] = useState("ONLINE_PORTAL");
  const [isRequired, setIsRequired] = useState(true);
  const [submissionDate, setSubmissionDate] = useState(today());
  const [decisionNote, setDecisionNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const proofFiles = useMemo(
    () =>
      uploadedIds.flatMap((id) => {
        const file = filesRef.current.get(id);
        return file ? [file] : [];
      }),
    [uploadedIds],
  );
  if (!canSubmit) return null;

  const reset = () => {
    setAuthorityName("");
    setSubmissionReference("");
    setSubmissionMethod("ONLINE_PORTAL");
    setIsRequired(true);
    setSubmissionDate(today());
    setDecisionNote("");
    setUploadedIds([]);
    filesRef.current.clear();
    setErrors({});
    setServerError("");
    mutation.reset();
  };
  const clearError = (key: keyof Errors) =>
    setErrors((current) => ({ ...current, [key]: undefined }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setServerError("");
    if (!canRecord)
      return setServerError(
        "This ComplianceDossier is not ready for an authority submission.",
      );
    const next: Errors = {};
    if (!authorityName.trim()) {
      next.authorityName = "Authority Portal is required.";
    } else if (authorityName.trim().length > 200) {
      next.authorityName = "Authority Portal must not exceed 200 characters.";
    }

    if (!submissionReference.trim()) {
      next.submissionReference = "Submission Reference is required.";
    } else if (submissionReference.trim().length > 150) {
      next.submissionReference = "Submission Reference must not exceed 150 characters.";
    }

    if (!submissionDate) {
      next.submissionDate = "Submission Date is required.";
    } else {
      const date = new Date(submissionDate);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (date > now) {
        next.submissionDate = "Submission date must not be in the future.";
      } else {
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - VALIDATION_LIMITS.dateWindowYears);
        minDate.setHours(0, 0, 0, 0);
        if (date < minDate) {
          next.submissionDate = `Submission date must be within the last ${VALIDATION_LIMITS.dateWindowYears} years.`;
        }
      }
    }

    if (decisionNote.trim().length > VALIDATION_LIMITS.noteMaxLength) {
      next.decisionNote = `Decision note must not exceed ${VALIDATION_LIMITS.noteMaxLength} characters.`;
    }

    if (Object.keys(next).length) return setErrors(next);
    try {
      await mutation.mutateAsync({
        authorityName,
        submissionReference,
        submissionMethod,
        submittedAt: `${submissionDate}T00:00:00.000Z`,
        isRequired,
        proofFiles,
        decisionNote,
      });
      onRecorded?.();
      setOpen(false);
      reset();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Unable to record the authority submission.",
      );
    }
  };

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
          className="bg-[#f39200] text-white hover:bg-[#d97f00]"
        >
          Record Authority Submission
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-0 max-h-[92vh] max-w-5xl overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase text-[#f39200]">
            Record Authority Submission
          </DialogTitle>
          <DialogDescription>
            Record the external authority submission for ComplianceDossier #
            {dossierId}.
          </DialogDescription>
        </DialogHeader>
        <form
          id="record-authority-submission"
          onSubmit={submit}
          className="min-w-0 space-y-5"
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Authority Portal *" error={errors.authorityName}>
              <Input
                className={
                  errors.authorityName
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                value={authorityName}
                onChange={(event) => {
                  setAuthorityName(event.target.value);
                  clearError("authorityName");
                }}
                placeholder="TRACES-NT, APHA IPAFFS, CDS"
              />
            </Field>
            <Field
              label="Submission Reference *"
              error={errors.submissionReference}
            >
              <Input
                className={
                  errors.submissionReference
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                value={submissionReference}
                onChange={(event) => {
                  setSubmissionReference(event.target.value);
                  clearError("submissionReference");
                }}
                placeholder="CHED-A / MRN reference"
              />
            </Field>
          </div>
          <Field label="Submission Method *">
            <select value={submissionMethod} onChange={(event) => setSubmissionMethod(event.target.value)} className="h-9 w-full rounded-[2px] border border-input bg-background px-3 text-sm">
              <option value="ONLINE_PORTAL">Online portal</option>
              <option value="EMAIL">Email</option>
              <option value="IN_PERSON">In person</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={isRequired} onCheckedChange={(checked) => setIsRequired(Boolean(checked))} aria-label="Mandatory submission" />
            Mandatory authority submission
          </label>
          <Field label="Submission Date *" error={errors.submissionDate}>
            <DatePicker
              className={errors.submissionDate ? "border-red-500" : ""}
              value={submissionDate}
              onChange={(value) => {
                setSubmissionDate(value);
                clearError("submissionDate");
              }}
            />
          </Field>
          <Field label="Proof files (optional)" error={errors.proofFiles}>
            <div
              className={
                errors.proofFiles ? "rounded border border-red-500 p-1" : ""
              }
            >
              <FileUploader
                entity="attachment"
                accept={ACCEPTED_PROOF_TYPES}
                maxSize={MAX_PROOF_SIZE}
                maxFiles={10}
                multiple
                title="Upload submission receipt"
                hint="PDF, JPG, or PNG · up to 10 MB per file · multiple files supported"
                onUploaded={({ publicId, file }) =>
                  filesRef.current.set(publicId, file)
                }
                onChange={(ids) => {
                  setUploadedIds(ids);
                  if (ids.length) clearError("proofFiles");
                }}
              />
            </div>
            <AuthorityEvidencePreview files={proofFiles} />
          </Field>
          <Field label="Additional Note">
            <Textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Optional note about the authority submission"
              rows={3}
            />
          </Field>
        </form>
        <DialogFooter className="gap-2 sm:justify-end">
          {serverError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-red-600">
                    <AlertCircle
                      className="size-5"
                      aria-label="Submission error"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{serverError}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="record-authority-submission"
            className="bg-[#f39200] text-white hover:bg-[#d97f00]"
            disabled={mutation.isPending || !canRecord}
          >
            {mutation.isPending && (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )}
            Confirm Submission Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
