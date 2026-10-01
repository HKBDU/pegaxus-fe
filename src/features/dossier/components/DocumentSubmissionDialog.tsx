import { zodResolver } from "@hookform/resolvers/zod";
import { FileImage, FileText, FolderUp, History, Info, Plus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatBookingDate } from "@/features/booking/utils";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { canUploadInitialDocument } from "../constants";
import { getChangedDocumentMetadata, mapComplianceDocumentError, useComplianceDocument, useSubmitDocumentVersion, useUpdateDocumentMetadata } from "../hooks/useComplianceDocument";
import { mapUploadDocumentError, useUploadComplianceDocument } from "../hooks/useUploadComplianceDocument";
import { createDocumentSubmissionSchema, validateUploadFiles } from "../schemas";
import type { ComplianceDocumentDetail, DossierOverview, DossierRequirement, UploadDocumentMetadata } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { DocumentVersionHistory } from "./DocumentVersionHistory";
import "./DocumentSubmissionDialog.css";

type Mode = "initial" | "edit" | "update";
type FormValues = UploadDocumentMetadata & { uploadNote: string; note: string };
const emptyValues: FormValues = {
  documentName: "", documentNumber: "", issuingAuthority: "", issuedDate: "", expiryDate: "", uploadNote: "", note: "",
};
const inputClass = "h-9 rounded-[2px] border-slate-300 bg-white text-xs transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-primary/20";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRevisionNotice({ document }: { document: ComplianceDocumentDetail }) {
  const request = document.openRequest;
  const latestReview = document.versions[0]?.review;
  return (
    <div className="space-y-2">
      {request ? (
        <section className="dossier-revision-notice rounded-[2px] border border-red-200 bg-red-50 p-4 text-xs" aria-label="Revision Request">
          <h3 className="font-heading text-sm font-bold uppercase text-red-800">Revision Request</h3>
          {request.dueDate ? <p className="mt-2 text-slate-600"><strong>Due Date:</strong> {formatBookingDate(request.dueDate)}</p> : null}
          <p className="mt-2 whitespace-pre-wrap text-slate-800"><strong>Details:</strong> {request.message}</p>
        </section>
      ) : null}
      {latestReview?.reviewComment ? (
        <section className="rounded-[2px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700" aria-label="Previous Review Comment">
          <strong>Previous Review Comment</strong>
          <p className="mt-1 whitespace-pre-wrap">{latestReview.reviewComment}</p>
        </section>
      ) : null}
    </div>
  );
}

export function DocumentSubmissionDialog({ dossier, requirement, mode, plannedDepartureDate, role, onClose }: {
  dossier: DossierOverview;
  requirement: DossierRequirement | null;
  mode: Mode;
  plannedDepartureDate?: string;
  role: string | undefined;
  onClose: () => void;
}) {
  const documentId = mode === "initial" ? null : String(requirement?.document?.complianceDocumentId ?? "");
  const detailQuery = useComplianceDocument(documentId);
  const detail = detailQuery.data;
  const initialMutation = useUploadComplianceDocument();
  const versionMutation = useSubmitDocumentVersion();
  const metadataMutation = useUpdateDocumentMetadata();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [noRetry, setNoRetry] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const submitGuardRef = useRef(false);
  const hydratedDocumentIdRef = useRef<number | null>(null);
  const schema = createDocumentSubmissionSchema(requirement?.validUntil ?? null, plannedDepartureDate);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const reset = form.reset;
  const pending = initialMutation.isPending || versionMutation.isPending || metadataMutation.isPending;

  useEffect(() => {
    if (!detail || hydratedDocumentIdRef.current === detail.complianceDocumentId) return;
    hydratedDocumentIdRef.current = detail.complianceDocumentId;
    reset({
      documentName: detail.documentName,
      documentNumber: detail.documentNumber ?? "",
      issuingAuthority: detail.issuingAuthority ?? "",
      issuedDate: detail.issuedDate ?? "",
      expiryDate: detail.expiryDate ?? "",
      uploadNote: "",
      note: detail.note ?? "",
    });
  }, [detail, reset]);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    const error = validateUploadFiles(next);
    if (error) { setFileError(error.message); return; }
    setFiles((current) => [...current, ...next]);
    setFileError("");
    if (!noRetry) setSubmitError("");
    if (pickerRef.current) pickerRef.current.value = "";
  };

  const close = () => {
    if (pending || submitGuardRef.current) return;
    setFiles([]);
    setFileError("");
    setSubmitError("");
    setNoRetry(false);
    form.reset(emptyValues);
    onClose();
  };

  const eligible = Boolean(requirement && role === "CUSTOMER" && dossier.status === "IN_PREPARATION" && !dossier.writeLocked && (
    mode === "initial" ? canUploadInitialDocument(role, dossier, requirement) :
      requirement.status !== "SATISFIED" && detail && (
        mode === "edit" ? detail.status === "PROVIDED" && !detail.versions[0]?.review : detail.status === "REJECTED"
      )
  ));

  const submitValid = async (values: FormValues, metadataOnly = false) => {
    if (!requirement || !eligible || submitGuardRef.current || pending || noRetry) return;
    if (!metadataOnly) {
      const error = validateUploadFiles(files);
      if (error) { setFileError(error.message); return; }
    }
    if (metadataOnly && (mode !== "edit" || !detail)) return;
    const changedMetadata = detail ? getChangedDocumentMetadata(values, detail) : {};
    if (!metadataOnly && mode === "edit" && ("documentName" in changedMetadata || "note" in changedMetadata)) {
      setSubmitError("Save Document Name or Document Note changes with Save Metadata Only before replacing files.");
      return;
    }
    submitGuardRef.current = true;
    setSubmitError("");
    let succeeded = false;
    try {
      if (mode === "initial") {
        await initialMutation.mutateAsync({
          dossierId: String(dossier.complianceDossierId), requirementId: requirement.dossierRequirementId,
          files, metadata: values,
        });
        toast.success("Compliance document uploaded successfully.");
      } else if (metadataOnly) {
        if (!Object.keys(changedMetadata).length) { setSubmitError("Change at least one metadata field before saving."); return; }
        await metadataMutation.mutateAsync({
          documentId: String(detail!.complianceDocumentId), dossierId: String(dossier.complianceDossierId), changes: changedMetadata,
        });
        toast.success("Document metadata updated successfully.");
      } else {
        const result = await versionMutation.mutateAsync({
          documentId: String(detail!.complianceDocumentId), dossierId: String(dossier.complianceDossierId), files,
          metadata: {
            documentNumber: values.documentNumber, issuingAuthority: values.issuingAuthority,
            issuedDate: values.issuedDate, expiryDate: values.expiryDate, uploadNote: values.uploadNote,
          },
        });
        toast.success(result.mode === "EDIT_IN_PLACE"
          ? `Document updated successfully. Version v${result.versionNo} remains pending review.`
          : `Document updated successfully. Version v${result.versionNo} has been submitted for review.`);
      }
      succeeded = true;
    } catch (cause) {
      const error = mode === "initial" ? mapUploadDocumentError(cause) : mapComplianceDocumentError(cause);
      setSubmitError(error.message);
      if (["DR_ALREADY_HAS_DOCUMENT", "DOSSIER_LOCKED", "DR_NOT_FOUND", "FORBIDDEN", "DOCUMENT_ALREADY_VERIFIED", "DOCUMENT_ALREADY_REVIEWED", "DOCUMENT_NOT_FOUND"].includes(error.code)) setNoRetry(true);
      if (error.field) form.setError(error.field, { message: error.message });
    } finally {
      submitGuardRef.current = false;
    }
    if (succeeded) close();
  };

  const title = mode === "initial" ? "Upload Compliance Document" : mode === "edit" ? "Edit Document" : "Update Document";
  const description = mode === "initial" ? "Submit files and document information for this dossier requirement."
    : mode === "edit" ? "Update the uploaded document before review."
      : "Correct the rejected document and respond to the revision request.";

  return (
    <Dialog open={Boolean(requirement)} onOpenChange={(open) => !open && close()}>
      <DialogContent className={`flex max-h-[min(92svh,900px)] max-w-none flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-[#f8f7f4] p-0 shadow-2xl sm:max-w-none motion-reduce:animate-none ${mode === "initial" ? "w-[min(100%-1.5rem,720px)]" : "w-[min(100%-1.5rem,800px)]"}`}>
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <DialogTitle className="pr-6 font-heading text-xl font-bold uppercase leading-tight text-primary sm:text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-600">{description}</DialogDescription>
        </DialogHeader>
        {mode !== "initial" && detailQuery.isPending ? <p className="p-6 text-sm text-slate-600">Loading document details...</p> :
          mode !== "initial" && (detailQuery.isError || !detail) ? <p role="alert" className="p-6 text-sm text-red-700">Could not load document details. Please try again.</p> : (
          <Form {...form}>
            <form id="dossier-document-form" onSubmit={(event) => void form.handleSubmit((values) => submitValid(values))(event)} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              <section className="rounded-[2px] border border-slate-200 bg-white p-4 text-xs" aria-label="Requirement summary">
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><FileText className="size-4 text-primary" /> Requirement summary</h3>
                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-4">
                  <div className="sm:col-span-2"><dt className="text-slate-500">Requirement</dt><dd className="font-semibold">{requirement?.requirementName}</dd></div>
                  <div><dt className="text-slate-500">Applies to</dt><dd>{requirement?.horseName ?? "Trip-level"}</dd></div>
                  <div><dt className="text-slate-500">Mandatory</dt><dd>{requirement?.isMandatory ? "Yes" : "No"}</dd></div>
                  <div><dt className="text-slate-500">Status</dt><dd><DossierStatusBadge status={detail?.status ?? dossier.status} /></dd></div>
                  {detail ? <><div className="sm:col-span-2"><dt className="text-slate-500">Document Code</dt><dd>{detail.documentCode}</dd></div><div><dt className="text-slate-500">Current Version</dt><dd>v{detail.versions[0]?.versionNo}</dd></div></> : null}
                  {requirement?.validUntil ? <div><dt className="text-slate-500">Valid Until</dt><dd>{formatBookingDate(requirement.validUntil)}</dd></div> : null}
                  {requirement?.note ? <div className="sm:col-span-4"><dt className="text-slate-500">Note</dt><dd>{requirement.note}</dd></div> : null}
                </dl>
              </section>
              {mode === "update" && detail ? <DocumentRevisionNotice document={detail} /> : null}
              {mode === "edit" ? <p className="rounded-[2px] bg-sky-50 p-3 text-xs text-sky-800">This document has not been reviewed yet. Changes may update the existing version in place.</p> : null}
              {!eligible && mode !== "initial" ? <p role="alert" className="rounded-[2px] bg-amber-50 p-3 text-xs text-amber-800">This document is read-only. Refresh the dossier to see its current status.</p> : null}
              {showHistory && detail ? <DocumentVersionHistory versions={detail.versions} /> : null}
              <div className={mode === "initial" ? "space-y-3" : "grid gap-3 md:grid-cols-2"}>
                <section className="rounded-[2px] border border-slate-200 bg-white p-4" aria-label="Document files">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><Upload className="size-4 text-primary" /> {mode === "initial" ? "Document files" : "Replacement files"}</h3>
                  {detail?.versions[0]?.files.length ? <div className="mb-3 text-xs text-slate-600"><strong>Current files</strong><ul className="mt-1 space-y-1">{detail.versions[0].files.map((file) => <li key={`${file.sortOrder}-${file.fileName}`} className="truncate">{file.fileName}</li>)}</ul></div> : null}
                  <input ref={pickerRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label="Choose document files" onChange={(event) => event.target.files && addFiles(event.target.files)} />
                  <button type="button" disabled={pending || !eligible} onClick={() => pickerRef.current?.click()}
                    onDragOver={(event) => { event.preventDefault(); if (!pending && eligible) setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(event) => { event.preventDefault(); setDragActive(false); if (!pending && eligible) addFiles(event.dataTransfer.files); }}
                    className={`flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-[2px] border border-dashed px-3 text-xs transition-[background-color,border-color,transform] duration-150 motion-reduce:transition-none ${dragActive ? "scale-[1.01] border-primary bg-orange-50" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-orange-50/40"}`}>
                    <FolderUp className={`size-6 text-slate-500 transition-transform motion-reduce:transition-none ${dragActive ? "-translate-y-0.5 text-primary" : ""}`} />
                    <span>Drag & drop files here or <span className="text-primary underline">click to browse</span></span>
                    <span className="text-slate-500">PDF, JPG, JPEG, PNG · Max 10MB per file</span>
                  </button>
                  {fileError ? <p role="alert" className="mt-2 text-xs text-red-700">{fileError}</p> : null}
                  {files.length ? <div className="mt-3 space-y-1.5">{files.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="dossier-upload-file-row flex items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs">
                      {file.type === "application/pdf" ? <FileText className="size-4 shrink-0 text-red-600" /> : <FileImage className="size-4 shrink-0 text-sky-600" />}
                      <span className="min-w-0 flex-1 truncate">{file.name}</span><span className="shrink-0 text-slate-500">{formatSize(file.size)}</span>
                      <button type="button" disabled={pending} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="p-1 hover:bg-slate-200"><X className="size-3.5" /></button>
                    </div>
                  ))}<button type="button" disabled={pending} onClick={() => pickerRef.current?.click()} className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"><Plus className="size-3.5" /> Add another file</button></div> : null}
                  <p className="mt-3 flex items-start gap-2 rounded-[2px] bg-sky-50 px-3 py-2 text-xs text-slate-600"><Info className="mt-0.5 size-3.5 shrink-0 text-sky-700" />{mode === "initial" ? "All selected files will be grouped into one DocumentVersion v1." : "The backend decides whether this updates the current version or creates a new one."}</p>
                </section>
                <section className="rounded-[2px] border border-slate-200 bg-white p-4" aria-label="Document information">
                  <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><FileText className="size-4 text-primary" /> Document information</h3>
                  <div className={mode === "initial" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
                    {(["documentName", "documentNumber", "issuingAuthority"] as const).filter((name) => mode === "initial" || mode === "edit" || name !== "documentName").map((name) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem className={mode === "initial" && name === "documentName" ? "sm:col-span-2" : ""}><FormLabel className="text-xs text-slate-700">{{ documentName: "Document Name", documentNumber: "Document Number", issuingAuthority: "Issuing Authority" }[name]}</FormLabel><FormControl><Input {...field} className={inputClass} maxLength={name === "documentName" ? 201 : undefined} /></FormControl><FormMessage className="text-xs" /></FormItem>} />
                    ))}
                    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                      {(["issuedDate", "expiryDate"] as const).map((name) => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel className="text-xs text-slate-700">{name === "issuedDate" ? "Issued Date" : "Expiry Date"}</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} aria-invalid={Boolean(form.formState.errors[name])} minDate={name === "expiryDate" ? [requirement?.validUntil, plannedDepartureDate?.slice(0, 10)].filter((date): date is string => Boolean(date)).sort().at(-1) : undefined} className={inputClass} /></FormControl><FormMessage className="text-xs" /></FormItem>} />)}
                    </div>
                    {mode === "edit" ? <><FormField control={form.control} name="note" render={({ field }) => <FormItem><FormLabel className="text-xs text-slate-700">Document Note</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl><FormMessage className="text-xs" /></FormItem>} /><p className="text-[11px] text-slate-500">Document Name and Document Note changes use Save Metadata Only. Save those before replacing files.</p></> : null}
                    {mode !== "initial" ? <FormField control={form.control} name="uploadNote" render={({ field }) => <FormItem><FormLabel className="text-xs text-slate-700">Response Note</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl><p className="text-[11px] text-slate-500">Optional note for the Transport Specialist.</p><FormMessage className="text-xs" /></FormItem>} /> : null}
                  </div>
                </section>
              </div>
              {submitError ? <p role="alert" className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p> : null}
            </form>
          </Form>
        )}
        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" disabled={pending} onClick={close} className="rounded-[2px]">Cancel</Button>
          {detail ? <Button type="button" variant="outline" onClick={() => setShowHistory((value) => !value)} className="rounded-[2px]"><History className="size-4" /> Version History</Button> : null}
          {mode === "edit" && detail ? <Button type="button" variant="outline" disabled={pending || noRetry || !eligible} onClick={() => void form.handleSubmit((values) => submitValid(values, true))()} className="rounded-[2px]">Save Metadata Only</Button> : null}
          <Button type="submit" form="dossier-document-form" disabled={pending || noRetry || !eligible || !files.length} className="min-w-40 rounded-[2px] font-heading uppercase transition-transform active:scale-[0.98] motion-reduce:transform-none">{pending ? "Submitting..." : mode === "initial" ? "Submit ComplianceDocument" : mode === "edit" ? "Save Changes" : "Submit Updated Document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
