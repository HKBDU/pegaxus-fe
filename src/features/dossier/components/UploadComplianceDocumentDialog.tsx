import { zodResolver } from "@hookform/resolvers/zod";
import { FileImage, FileText, FolderUp, Info, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { formatBookingDate } from "@/features/booking/utils";
import { canUploadInitialDocument } from "../constants";
import { mapUploadDocumentError, useUploadComplianceDocument } from "../hooks/useUploadComplianceDocument";
import { createUploadDocumentSchema, validateUploadFiles } from "../schemas";
import type { DossierOverview, DossierRequirement, UploadDocumentMetadata } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import "./UploadComplianceDocumentDialog.css";

const emptyMetadata: UploadDocumentMetadata = {
  documentName: "", documentNumber: "", issuingAuthority: "", issuedDate: "", expiryDate: "",
};
const inputClass = "h-9 rounded-[2px] border-slate-300 bg-white text-xs transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-primary/20";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadComplianceDocumentDialog({
  dossier,
  requirement,
  plannedDepartureDate,
  role,
  onClose,
}: {
  dossier: DossierOverview;
  requirement: DossierRequirement | null;
  plannedDepartureDate?: string;
  role: string | undefined;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [noRetry, setNoRetry] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const submitGuardRef = useRef(false);
  const mutation = useUploadComplianceDocument();
  const schema = createUploadDocumentSchema(requirement?.validUntil ?? null, plannedDepartureDate);
  const form = useForm<UploadDocumentMetadata>({ resolver: zodResolver(schema), defaultValues: emptyMetadata });
  const pending = mutation.isPending;

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    const error = validateUploadFiles(next);
    if (error) {
      setFileError(error.message);
      return;
    }
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
    form.reset(emptyMetadata);
    onClose();
  };

  const submitValid = async (metadata: UploadDocumentMetadata) => {
    if (!requirement || !canUploadInitialDocument(role, dossier, requirement) || submitGuardRef.current || pending || noRetry) return;
    const error = validateUploadFiles(files);
    if (error) {
      setFileError(error.message);
      return;
    }
    submitGuardRef.current = true;
    setSubmitError("");
    let succeeded = false;
    try {
      await mutation.mutateAsync({
        dossierId: String(dossier.complianceDossierId),
        requirementId: requirement.dossierRequirementId,
        files,
        metadata,
      });
      succeeded = true;
      toast.success("Compliance document uploaded successfully.");
    } catch (cause) {
      const uploadError = mapUploadDocumentError(cause);
      setSubmitError(uploadError.message);
      if (["DR_ALREADY_HAS_DOCUMENT", "DOSSIER_LOCKED", "DR_NOT_FOUND", "FORBIDDEN"].includes(uploadError.code)) setNoRetry(true);
      if (uploadError.field) form.setError(uploadError.field, { message: uploadError.message });
    } finally {
      submitGuardRef.current = false;
    }
    if (succeeded) close();
  };

  return (
    <Dialog open={Boolean(requirement)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[min(92svh,900px)] w-[min(100%-1.5rem,720px)] max-w-none flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-[#f8f7f4] p-0 shadow-2xl sm:max-w-none">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <DialogTitle className="pr-6 font-heading text-xl font-bold uppercase leading-tight text-primary sm:text-2xl">Upload Compliance Document</DialogTitle>
          <DialogDescription className="text-xs text-slate-600">Submit files and document information for this dossier requirement.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="dossier-upload-form" onSubmit={(event) => void form.handleSubmit(submitValid)(event)} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
            <section className="rounded-[2px] border border-slate-200 bg-white p-4" aria-label="Requirement summary">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><FileText className="size-4 text-primary" /> Requirement summary</h3>
              <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                <div className="sm:col-span-2"><dt className="text-slate-500">Requirement</dt><dd className="font-semibold text-slate-900">{requirement?.requirementName}</dd></div>
                <div><dt className="text-slate-500">Applies to</dt><dd className="font-medium">{requirement?.horseName ?? "Trip-level"}</dd></div>
                <div><dt className="text-slate-500">Mandatory</dt><dd>{requirement?.isMandatory ? "Yes" : "No"}</dd></div>
                <div><dt className="text-slate-500">Dossier status</dt><dd><DossierStatusBadge status={dossier.status} /></dd></div>
                <div><dt className="text-slate-500">Valid until</dt><dd>{requirement?.validUntil ? formatBookingDate(requirement.validUntil) : "Not specified"}</dd></div>
                {requirement?.note ? <div className="sm:col-span-4"><dt className="text-slate-500">Note</dt><dd>{requirement.note}</dd></div> : null}
              </dl>
            </section>

            <section className="rounded-[2px] border border-slate-200 bg-white p-4" aria-label="Document files">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><Upload className="size-4 text-primary" /> Document files</h3>
              <input ref={pickerRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} aria-label="Choose document files" onChange={(event) => event.target.files && addFiles(event.target.files)} />
              <button
                type="button"
                disabled={pending}
                onClick={() => pickerRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); if (!pending) setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => { event.preventDefault(); setDragActive(false); if (!pending) addFiles(event.dataTransfer.files); }}
                className={`flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-[2px] border border-dashed px-3 text-xs transition-[background-color,border-color,transform] duration-150 motion-reduce:transition-none ${dragActive ? "scale-[1.01] border-primary bg-orange-50" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-orange-50/40"}`}
              >
                <FolderUp className={`size-6 text-slate-500 transition-transform motion-reduce:transition-none ${dragActive ? "-translate-y-0.5 text-primary" : ""}`} />
                <span className="font-medium">Drag & drop files here or <span className="text-primary underline">click to browse</span></span>
                <span className="text-slate-500">PDF, JPG, JPEG, PNG · Max 10MB per file</span>
              </button>
              {fileError ? <p role="alert" className="mt-2 text-xs text-red-700">{fileError}</p> : null}
              {files.length ? (
                <div className="mt-3 space-y-1.5">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="dossier-upload-file-row flex items-center gap-2 rounded-[2px] border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs">
                      {file.type === "application/pdf" ? <FileText className="size-4 shrink-0 text-red-600" /> : <FileImage className="size-4 shrink-0 text-sky-600" />}
                      <span className="min-w-0 flex-1 truncate">{file.name}</span><span className="shrink-0 text-slate-500">{formatSize(file.size)}</span>
                      <button type="button" disabled={pending} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="rounded-[2px] p-1 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-primary"><X className="size-3.5" /></button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <button type="button" disabled={pending} onClick={() => pickerRef.current?.click()} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><Plus className="size-3.5" /> Add another file</button>
                    <span>{files.length} {files.length === 1 ? "file" : "files"} selected · {formatSize(files.reduce((total, file) => total + file.size, 0))} total</span>
                  </div>
                </div>
              ) : null}
              <p className="mt-3 flex items-start gap-2 rounded-[2px] bg-sky-50 px-3 py-2 text-xs text-slate-600"><Info className="mt-0.5 size-3.5 shrink-0 text-sky-700" /> All selected files will be grouped into one DocumentVersion v1.</p>
            </section>

            <section className="rounded-[2px] border border-slate-200 bg-white p-4" aria-label="Document information">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase text-slate-900"><FileText className="size-4 text-primary" /> Document information</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["documentName", "documentNumber", "issuingAuthority"] as const).map((name) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem className={name === "documentName" ? "sm:col-span-2" : ""}>
                      <FormLabel className="text-xs text-slate-700">{{ documentName: "Document Name", documentNumber: "Document Number", issuingAuthority: "Issuing Authority" }[name]}</FormLabel>
                      <FormControl><Input {...field} className={inputClass} maxLength={name === "documentName" ? 201 : undefined} /></FormControl>
                      {name === "documentName" ? <p className="text-[11px] text-slate-500">Leave blank to use the requirement name.</p> : null}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                ))}
                {(["issuedDate", "expiryDate"] as const).map((name) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-700">{name === "issuedDate" ? "Issued Date" : "Expiry Date"}</FormLabel>
                      <FormControl><DatePicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} aria-invalid={Boolean(form.formState.errors[name])} minDate={name === "expiryDate" ? [requirement?.validUntil, plannedDepartureDate?.slice(0, 10)].filter((date): date is string => Boolean(date)).sort().at(-1) : undefined} className="h-9 rounded-[2px] border-slate-300 bg-white text-xs focus-visible:border-primary focus-visible:ring-primary/20" /></FormControl>
                      {name === "expiryDate" && requirement?.validUntil ? <p className="text-[11px] text-slate-500">Document must remain valid through {formatBookingDate(requirement.validUntil)}.</p> : null}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Only files are universally required. Expiry validity is checked against available booking and requirement dates.</p>
            </section>
            {submitError ? <p role="alert" className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{submitError}</p> : null}
          </form>
        </Form>
        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" disabled={pending} onClick={close} className="rounded-[2px]">Cancel</Button>
          <Button type="submit" form="dossier-upload-form" disabled={pending || noRetry || !files.length} className="min-w-52 rounded-[2px] font-heading uppercase transition-transform active:scale-[0.98] motion-reduce:transform-none">{pending ? "Submitting..." : "Submit ComplianceDocument"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
