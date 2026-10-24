import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, History, Info, Upload } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatBookingDate } from "@/features/booking/utils";
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
  FormField,
  FormItem,
  FormLabel,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import FileUploader, {
  type FileUploaderHandle,
  type FileUploaderSnapshot,
} from "@/shared/components/FileUploader";
import {
  canUploadInitialDocument,
  DOSSIER_UPLOAD_ACCEPT,
  UPLOAD_MAX_FILE_BYTES,
} from "../constants";
import {
  getChangedDocumentMetadata,
  mapComplianceDocumentError,
  useComplianceDocument,
  useSubmitDocumentVersion,
  useUpdateDocumentMetadata,
} from "../hooks/useComplianceDocument";
import {
  mapUploadDocumentError,
  useUploadComplianceDocument,
} from "../hooks/useUploadComplianceDocument";
import {
  createDocumentSubmissionSchema,
  getDocumentExpiryPolicy,
  validateUploadedAssets,
} from "../schemas";
import { createDossierUploadedAsset } from "../lib/uploaded-assets";
import type { EntityId } from "@/shared/types";
import type { z } from "zod";
import type {
  ComplianceDocumentDetail,
  DossierOverview,
  DossierRequirement,
  DossierUploadedAssetRef,
} from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { DocumentVersionHistory } from "./DocumentVersionHistory";
import { DocumentRequestAlert } from "./DocumentRequestAlert";
import { DossierFormMessage } from "./DossierFormMessage";
import "./DocumentSubmissionDialog.css";

type Mode = "initial" | "edit" | "update";
type FormValues = z.input<ReturnType<typeof createDocumentSubmissionSchema>>;
const emptyValues: FormValues = {
  documentNumber: "",
  issuingAuthority: "",
  issuedDate: "",
  expiryDate: "",
  uploadNote: "",
};
const inputClass =
  "h-9 rounded-[2px] border-slate-300 bg-white text-xs transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-primary/20";

function getCompletedUploadFiles(snapshot: FileUploaderSnapshot | null) {
  if (!snapshot?.items.length) return null;
  try {
    const files = snapshot.items.map((item) => {
      if (item.status !== "success" || !item.publicId) {
        throw new Error("Every selected file must finish uploading.");
      }
      return createDossierUploadedAsset(item.publicId, item.file);
    });
    return validateUploadedAssets(files) ? null : files;
  } catch {
    return null;
  }
}

export function DocumentRevisionNotice({
  document,
}: {
  document: ComplianceDocumentDetail;
}) {
  const request = document.openRequest;
  const latestReview = document.versions[0]?.review;
  return (
    <div className="space-y-2">
      {request ? <DocumentRequestAlert request={request} /> : null}
      {latestReview?.reviewComment &&
      !(
        latestReview.result === "REJECTED" &&
        latestReview.reviewComment.trim() === request?.message.trim()
      ) ? (
        <section
          className="rounded-[2px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
          aria-label="Previous Review Comment"
        >
          <strong>Previous Review Comment</strong>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
            {latestReview.reviewComment}
          </p>
        </section>
      ) : null}
    </div>
  );
}

export function DocumentSubmissionDialog({
  dossier,
  requirement,
  mode,
  plannedDepartureDate,
  role,
  onClose,
}: {
  dossier: DossierOverview;
  requirement: DossierRequirement | null;
  mode: Mode;
  plannedDepartureDate?: string;
  role: string | undefined;
  onClose: () => void;
}) {
  const documentId =
    mode === "initial"
      ? null
      : String(requirement?.document?.complianceDocumentId ?? "");
  const detailQuery = useComplianceDocument(
    documentId,
    String(dossier.complianceDossierId),
    String(requirement?.dossierRequirementId ?? ""),
  );
  const detail = detailQuery.data;
  const initialMutation = useUploadComplianceDocument();
  const versionMutation = useSubmitDocumentVersion();
  const metadataMutation = useUpdateDocumentMetadata();
  const [uploadSession, setUploadSession] = useState(0);
  const uploadScope = `${dossier.complianceDossierId}:${requirement?.dossierRequirementId ?? ""}:${mode}:${uploadSession}`;
  const activeUploadScope = useRef(uploadScope);
  useLayoutEffect(() => {
    activeUploadScope.current = uploadScope;
    return () => {
      activeUploadScope.current = "";
    };
  }, [uploadScope]);
  const uploaderRef = useRef<FileUploaderHandle>(null);
  const [uploadState, setUploadState] = useState<{
    scope: string;
    snapshot: FileUploaderSnapshot;
  } | null>(null);
  const [frozenSelection, setFrozenSelection] = useState<{
    scope: string;
    files: DossierUploadedAssetRef[];
  } | null>(null);
  const snapshot =
    uploadState?.scope === uploadScope ? uploadState.snapshot : null;
  const filesLocked = frozenSelection?.scope === uploadScope;
  const files = filesLocked
    ? frozenSelection.files
    : getCompletedUploadFiles(snapshot);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [noRetry, setNoRetry] = useState(false);
  const [serverRequiresExpiry, setServerRequiresExpiry] = useState<true>();
  const [showHistory, setShowHistory] = useState(false);
  const lockedUploadScope = useRef<string | null>(null);
  const submitGuardRef = useRef(false);
  const hydratedDocumentIdRef = useRef<EntityId | null>(null);
  const [documentBaseline, setDocumentBaseline] = useState<{
    documentId: EntityId;
    updatedAt: string;
  } | null>(null);
  const expiryPolicy = getDocumentExpiryPolicy(
    requirement?.validUntil ?? null,
    serverRequiresExpiry,
  );
  const expiryRequired = expiryPolicy === "required";
  const expiryAriaRequired = expiryRequired
    ? true
    : expiryPolicy === "optional"
      ? false
      : undefined;
  const schema = createDocumentSubmissionSchema(
    requirement?.validUntil ?? null,
    plannedDepartureDate,
    mode,
    detail,
    serverRequiresExpiry,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: emptyValues,
  });
  const reset = form.reset;
  const pending =
    initialMutation.isPending ||
    versionMutation.isPending ||
    metadataMutation.isPending;

  useEffect(() => {
    if (
      !detail ||
      hydratedDocumentIdRef.current === detail.complianceDocumentId
    )
      return;
    hydratedDocumentIdRef.current = detail.complianceDocumentId;
    reset({
      documentNumber: detail.documentNumber ?? "",
      issuingAuthority: detail.issuingAuthority ?? "",
      issuedDate: detail.issuedDate ?? "",
      expiryDate: detail.expiryDate ?? "",
      uploadNote: "",
    });
    void form.trigger();
  }, [detail, form, reset]);

  // Capture once per document; a background refetch must not rebase unsaved input.
  if (detail && documentBaseline?.documentId !== detail.complianceDocumentId) {
    setDocumentBaseline({
      documentId: detail.complianceDocumentId,
      updatedAt: detail.updatedAt,
    });
  }

  const changeUploadState = (next: FileUploaderSnapshot) => {
    if (
      activeUploadScope.current !== uploadScope ||
      lockedUploadScope.current === uploadScope
    )
      return;
    setUploadState({ scope: uploadScope, snapshot: next });
    setFileError("");
  };
  const resetUploads = () => {
    activeUploadScope.current = "";
    lockedUploadScope.current = null;
    setUploadSession((value) => value + 1);
    setUploadState(null);
    setFrozenSelection(null);
    setFileError("");
  };

  const close = () => {
    if (pending || submitGuardRef.current) return;
    resetUploads();
    setSubmitError("");
    setNoRetry(false);
    setServerRequiresExpiry(undefined);
    hydratedDocumentIdRef.current = null;
    setDocumentBaseline(null);
    form.reset(emptyValues);
    onClose();
  };

  const documentChanged = Boolean(
    detail &&
    documentBaseline &&
    detail.updatedAt !== documentBaseline.updatedAt,
  );
  const eligible = Boolean(
    !documentChanged &&
    requirement &&
    role === "CUSTOMER" &&
    ["IN_PREPARATION", "REJECTED"].includes(dossier.status) &&
    !dossier.writeLocked &&
    (mode === "initial"
      ? canUploadInitialDocument(role, dossier, requirement)
      : requirement.status !== "SATISFIED" &&
        requirement.status !== "WAIVED" &&
        detail &&
        (mode === "edit"
          ? detail.status === "PROVIDED" &&
            detail.versions[0]?.review?.result !== "APPROVED"
          : detail.status === "REJECTED")),
  );
  const canSubmit = Boolean(
    eligible &&
    !pending &&
    !noRetry &&
    files?.length &&
    form.formState.isValid &&
    !form.formState.isValidating &&
    !form.formState.isSubmitting,
  );

  const submitValid = async (values: FormValues, metadataOnly = false) => {
    if (
      !requirement ||
      activeUploadScope.current !== uploadScope ||
      !eligible ||
      submitGuardRef.current ||
      pending ||
      noRetry
    )
      return;
    let submittedFiles = files ?? [];
    if (!metadataOnly && !filesLocked) {
      const current = uploaderRef.current?.getSnapshot() ?? null;
      const completedFiles = getCompletedUploadFiles(current);
      if (!completedFiles || !current) {
        setFileError(
          "Every selected file must upload successfully. Retry or remove failed files before submitting.",
        );
        return;
      }
      if (!uploaderRef.current?.lockCompletedSelection(current.revision)) {
        setFileError(
          "The selected files changed. Review all uploads before submitting again.",
        );
        return;
      }
      submittedFiles = completedFiles;
    }
    if (!metadataOnly && validateUploadedAssets(submittedFiles)) return;
    if (metadataOnly && (mode !== "edit" || !detail)) return;
    const changedMetadata = detail
      ? getChangedDocumentMetadata(values, detail)
      : {};
    if (!metadataOnly) {
      lockedUploadScope.current = uploadScope;
      setFrozenSelection({ scope: uploadScope, files: submittedFiles });
      setFileError("");
    }
    submitGuardRef.current = true;
    setSubmitError("");
    let succeeded = false;
    try {
      if (mode === "initial") {
        await initialMutation.mutateAsync({
          dossierId: String(dossier.complianceDossierId),
          requirementId: requirement.dossierRequirementId,
          files: submittedFiles,
          metadata: values,
        });
        toast.success("Compliance document uploaded successfully.");
      } else if (metadataOnly) {
        if (!Object.keys(changedMetadata).length) {
          setSubmitError("Change at least one metadata field before saving.");
          return;
        }
        await metadataMutation.mutateAsync({
          documentId: String(detail!.complianceDocumentId),
          dossierId: String(dossier.complianceDossierId),
          requirementId: requirement.dossierRequirementId,
          changes: changedMetadata,
        });
        toast.success("Document metadata updated successfully.");
      } else {
        const result = await versionMutation.mutateAsync({
          documentId: String(detail!.complianceDocumentId),
          dossierId: String(dossier.complianceDossierId),
          requirementId: requirement.dossierRequirementId,
          files: submittedFiles,
          metadata: {
            documentNumber: values.documentNumber,
            issuingAuthority: values.issuingAuthority,
            issuedDate: values.issuedDate,
            expiryDate: values.expiryDate,
            uploadNote: values.uploadNote,
          },
        });
        toast.success(
          result.mode === "EDIT_IN_PLACE"
            ? `Document updated successfully. Version v${result.versionNo} remains pending review.`
            : `Document updated successfully. Version v${result.versionNo} has been submitted for review.`,
        );
      }
      succeeded = true;
    } catch (cause) {
      const error =
        mode === "initial"
          ? mapUploadDocumentError(cause)
          : mapComplianceDocumentError(cause);
      setSubmitError(error.message);
      if (
        error.field === "expiryDate" &&
        error.message === "Expiry date is required for this requirement."
      )
        setServerRequiresExpiry(true);
      if (
        [
          "DR_ALREADY_HAS_DOCUMENT",
          "DOSSIER_LOCKED",
          "DR_NOT_FOUND",
          "FORBIDDEN",
          "DOCUMENT_ALREADY_VERIFIED",
          "DOCUMENT_ALREADY_REVIEWED",
          "DOCUMENT_NOT_FOUND",
        ].includes(error.code)
      )
        setNoRetry(true);
      if (error.field) form.setError(error.field, { message: error.message });
    } finally {
      submitGuardRef.current = false;
    }
    if (succeeded) close();
  };

  const title =
    mode === "initial"
      ? "Upload Compliance Document"
      : mode === "edit"
        ? "Edit Document"
        : "Update Document";
  const description =
    mode === "initial"
      ? "Submit files and document information for this dossier requirement."
      : mode === "edit"
        ? "Update the provided document. Version handling is determined by its review history."
        : "Correct the rejected document and respond to the revision request.";

  return (
    <Dialog
      open={Boolean(requirement)}
      onOpenChange={(open) => !open && close()}
    >
      <DialogContent
        className={`flex max-h-[min(92svh,900px)] max-w-none flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-[#f8f7f4] p-0 shadow-2xl sm:max-w-none motion-reduce:animate-none ${mode === "initial" ? "w-[min(100%-1.5rem,720px)]" : "w-[min(100%-1.5rem,800px)]"}`}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <DialogTitle className="pr-6 font-heading text-xl font-bold uppercase leading-tight text-primary sm:text-2xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>
        {mode !== "initial" && detailQuery.isPending ? (
          <p className="p-6 text-sm text-slate-600">
            Loading document details...
          </p>
        ) : mode !== "initial" && (detailQuery.isError || !detail) ? (
          <p role="alert" className="p-6 text-sm text-red-700">
            Could not load document details. Please try again.
          </p>
        ) : (
          <Form {...form}>
            <form
              id="dossier-document-form"
              onSubmit={(event) =>
                void form.handleSubmit((values) => submitValid(values))(event)
              }
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6"
            >
              <section
                className="rounded-[2px] border border-slate-200 bg-white p-4 text-xs"
                aria-label="Requirement summary"
              >
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900">
                  <FileText className="size-4 text-primary" /> Requirement
                  summary
                </h3>
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Requirement</dt>
                    <dd className="font-semibold">
                      {requirement?.requirementName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Applies to</dt>
                    <dd>{requirement?.horseName ?? "Trip-level"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Mandatory</dt>
                    <dd>{requirement?.isMandatory ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <DossierStatusBadge
                        status={detail?.status ?? dossier.status}
                      />
                    </dd>
                  </div>
                  {detail ? (
                    <>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Document Code</dt>
                        <dd>{detail.documentCode}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Current Version</dt>
                        <dd>v{detail.versions[0]?.versionNo}</dd>
                      </div>
                    </>
                  ) : null}
                  {requirement?.validUntil ? (
                    <div>
                      <dt className="text-slate-500">Valid Until</dt>
                      <dd>{formatBookingDate(requirement.validUntil)}</dd>
                    </div>
                  ) : null}
                  {requirement?.note ? (
                    <div className="sm:col-span-4">
                      <dt className="text-slate-500">Note</dt>
                      <dd>{requirement.note}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
              {mode === "update" && detail ? (
                <DocumentRevisionNotice document={detail} />
              ) : null}
              {mode === "edit" ? (
                <p className="rounded-[2px] bg-sky-50 p-3 text-xs text-sky-800">
                  Files replace the current version only when it has never been
                  reviewed. Otherwise, the backend creates a new version. Saving
                  metadata only does not replace files.
                </p>
              ) : null}
              {documentChanged ? (
                <p
                  role="alert"
                  className="rounded-[2px] bg-amber-50 p-3 text-xs text-amber-800"
                >
                  The document changed while this form was open. Close and
                  reopen it to review the latest metadata and files before
                  submitting. Your input has not been saved.
                </p>
              ) : null}
              {!eligible && !documentChanged && mode !== "initial" ? (
                <p
                  role="alert"
                  className="rounded-[2px] bg-amber-50 p-3 text-xs text-amber-800"
                >
                  This document is read-only. Refresh the dossier to see its
                  current status.
                </p>
              ) : null}
              {showHistory && detail ? (
                <DocumentVersionHistory versions={detail.versions} />
              ) : null}
              <div
                className={
                  mode === "initial" ? "space-y-3" : "grid gap-3 md:grid-cols-2"
                }
              >
                <section
                  className="rounded-[2px] border border-slate-200 bg-white p-4"
                  aria-label="Document files"
                >
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900">
                    <Upload className="size-4 text-primary" />{" "}
                    {mode === "initial"
                      ? "Document files"
                      : "Replacement files"}
                  </h3>
                  <p className="mb-3 text-xs text-slate-600">
                    Select 1–10 files in the desired order. The first is
                    primary. A replacement uses this entire file set, not just
                    the changed pages.
                  </p>
                  {detail?.versions[0]?.files.length ? (
                    <div className="mb-3 text-xs text-slate-600">
                      <strong>Current files</strong>
                      <ul className="mt-1 space-y-1">
                        {detail.versions[0].files.map((file) => (
                          <li
                            key={`${file.sortOrder}-${file.fileName}`}
                            className="truncate"
                          >
                            {file.fileName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!filesLocked ? (
                    <>
                      <FileUploader
                        key={uploadScope}
                        ref={uploaderRef}
                        entity="attachment"
                        accept={DOSSIER_UPLOAD_ACCEPT}
                        maxSize={UPLOAD_MAX_FILE_BYTES}
                        maxFiles={10}
                        multiple
                        disabled={pending || noRetry || !eligible}
                        onStateChange={changeUploadState}
                        title="Upload document files"
                        hint="PDF, JPG, JPEG, PNG · Max 5 MiB per file"
                        onReject={() => {
                          if (
                            activeUploadScope.current !== uploadScope ||
                            lockedUploadScope.current === uploadScope
                          )
                            return;
                          setFileError(
                            "Some files were rejected. Use PDF, JPG, JPEG, or PNG files of 5 MiB or smaller.",
                          );
                        }}
                      />
                      <p className="mt-3 text-xs leading-relaxed text-slate-600">
                        Files upload automatically when selected. Submit is
                        available only after every remaining file is uploaded
                        and the document information is valid. Uploading files
                        does not submit or approve the dossier.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <p
                        role="status"
                        className="font-semibold text-emerald-700"
                      >
                        Files included in this submission
                      </p>
                      <ol className="space-y-1.5">
                        {files?.map((file, index) => (
                          <li
                            key={`${file.publicId}-${index}`}
                            className="dossier-upload-file-row break-all rounded-[2px] border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            {index + 1}. {file.fileName}{" "}
                            <span className="text-slate-500">
                              ({index === 0 ? "Primary file" : "Attachment"})
                            </span>
                          </li>
                        ))}
                      </ol>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={resetUploads}
                      >
                        Choose files again
                      </Button>
                    </div>
                  )}
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-2 min-h-10 text-xs leading-5 text-slate-600"
                  >
                    {filesLocked
                      ? "All files uploaded — File selection locked for this attempt."
                      : !snapshot?.items.length
                        ? "Select files to begin uploading."
                        : `${snapshot.items.filter((item) => item.status === "success").length} of ${snapshot.items.length} files uploaded · ${
                            snapshot.items.some(
                              (item) => item.status === "error",
                            )
                              ? `${snapshot.items.filter((item) => item.status === "error").length} failed — Retry or Remove`
                              : snapshot.items.some(
                                    (item) =>
                                      item.status === "queued" ||
                                      item.status === "uploading",
                                  )
                                ? "Waiting for all uploads to finish"
                                : !files
                                  ? "Invalid upload result — Remove the affected file"
                                  : !form.formState.isValid
                                    ? "Complete valid document information to submit"
                                    : canSubmit
                                      ? "All files uploaded — Ready to submit"
                                      : "All files uploaded — Submission unavailable"
                          }`}
                  </p>
                  {fileError ? (
                    <p role="alert" className="mt-2 text-xs text-red-700">
                      {fileError}
                    </p>
                  ) : null}
                  <p className="mt-3 flex items-start gap-2 rounded-[2px] bg-sky-50 px-3 py-2 text-xs text-slate-600">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-sky-700" />
                    {mode === "initial"
                      ? "All selected files will be grouped into one DocumentVersion v1."
                      : "The backend decides whether this updates the current version or creates a new one."}
                  </p>
                </section>
                <section
                  className="rounded-[2px] border border-slate-200 bg-white p-4"
                  aria-label="Document information"
                >
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900">
                    <FileText className="size-4 text-primary" /> Document
                    information
                  </h3>
                  {mode !== "initial" ? (
                    <p className="mb-3 text-xs text-slate-600">
                      Existing metadata cannot be cleared. Keep its current
                      value or enter a replacement.
                    </p>
                  ) : null}
                  <div
                    className={
                      mode === "initial"
                        ? "grid gap-3 sm:grid-cols-2"
                        : "space-y-3"
                    }
                  >
                    {(["documentNumber", "issuingAuthority"] as const).map(
                      (name) => (
                        <FormField
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-700">
                                {name === "documentNumber"
                                  ? "Document Number"
                                  : "Issuing Authority"}
                                {mode === "initial" ? " *" : ""}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  className={inputClass}
                                  maxLength={
                                    name === "documentNumber" ? 150 : 200
                                  }
                                />
                              </FormControl>
                              <DossierFormMessage />
                            </FormItem>
                          )}
                        />
                      ),
                    )}
                    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                      {(["issuedDate", "expiryDate"] as const).map((name) => (
                        <FormField
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-slate-700">
                                {name === "issuedDate"
                                  ? "Issued Date"
                                  : "Expiry Date"}
                                {name === "expiryDate" && expiryRequired
                                  ? " *"
                                  : ""}
                              </FormLabel>
                              <FormControl>
                                <DatePicker
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  aria-required={
                                    name === "expiryDate"
                                      ? expiryAriaRequired
                                      : mode === "initial"
                                  }
                                  aria-invalid={Boolean(
                                    form.formState.errors[name],
                                  )}
                                  minDate={
                                    name === "expiryDate"
                                      ? [
                                          requirement?.validUntil,
                                          plannedDepartureDate?.slice(0, 10),
                                        ]
                                          .filter((date): date is string =>
                                            Boolean(date),
                                          )
                                          .sort()
                                          .at(-1)
                                      : undefined
                                  }
                                  className={inputClass}
                                />
                              </FormControl>
                              <DossierFormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="uploadNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-700">
                            Upload Note
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              maxLength={2000}
                              className={inputClass}
                            />
                          </FormControl>
                          <p className="text-[11px] text-slate-500">
                            Optional note for this submission. Metadata-only
                            saves do not change this note.
                          </p>
                          <DossierFormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              </div>
              {submitError ? (
                <p
                  role="alert"
                  className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {submitError}
                </p>
              ) : null}
            </form>
          </Form>
        )}
        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
            className="rounded-[2px]"
          >
            Cancel
          </Button>
          {detail ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHistory((value) => !value)}
              className="rounded-[2px]"
            >
              <History className="size-4" /> Version History
            </Button>
          ) : null}
          {mode === "edit" && detail ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || noRetry || !eligible}
              onClick={() =>
                void form.handleSubmit((values) => submitValid(values, true))()
              }
              className="rounded-[2px]"
            >
              Save Metadata Only
            </Button>
          ) : null}
          <Button
            type="submit"
            form="dossier-document-form"
            disabled={!canSubmit}
            className="min-w-40 rounded-[2px] font-heading uppercase transition-transform active:scale-[0.98] motion-reduce:transform-none"
          >
            {pending
              ? "Submitting..."
              : mode === "initial"
                ? "Submit ComplianceDocument"
                : mode === "edit"
                  ? "Save Changes"
                  : "Submit Updated Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
