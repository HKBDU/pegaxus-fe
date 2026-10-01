import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { normalizeRole } from "@/features/auth/access-control";
import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { useReadyForSubmission } from "../hooks/useReadyForSubmission";
import { canMarkReadyForSubmission, mapDocumentReviewError } from "../lib/document-review";
import type { DocumentReviewError, DossierOverview } from "../types";

export function DossierReadinessAction({ dossier }: { dossier: DossierOverview }) {
  const roles = useAuthStore((state) => state.principal?.roles);
  const role = roles?.find((value) => normalizeRole(value) === "TRANSPORT_SPECIALIST");
  const eligible = canMarkReadyForSubmission(role, dossier);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<DocumentReviewError | null>(null);
  const mutation = useReadyForSubmission();
  async function confirm() {
    if (!eligible || mutation.isPending) return;
    setError(null);
    try {
      const attempt = await mutation.markReady(String(dossier.complianceDossierId));
      if (!attempt.started) return;
      toast.success(attempt.value.message);
      setOpen(false);
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      setError(mapped);
      toast.error(mapped.message);
    }
  }
  return (
    <>
      {eligible ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-xs text-emerald-800">All mandatory requirements are complete. The dossier can be marked ready for submission.</p><Button className="rounded-[2px]" onClick={() => { setError(null); setOpen(true); }}>Mark Ready for Submission</Button></div> : null}
      <AlertDialog open={open} onOpenChange={(value) => !mutation.isPending && setOpen(value)}>
        <AlertDialogContent className="rounded-[2px] bg-white">
          <AlertDialogHeader><AlertDialogTitle className="font-heading text-xl">Mark dossier ready for submission?</AlertDialogTitle><AlertDialogDescription>All mandatory requirements must be complete. This only changes the dossier state to READY_FOR_SUBMISSION. It does NOT submit anything to an authority.</AlertDialogDescription></AlertDialogHeader>
          {!eligible ? <p role="alert" className="text-sm text-red-700">Dossier eligibility has changed. Refresh and check the current progress.</p> : null}
          {error ? <div role="alert" className="text-sm text-red-700"><p>{error.message}</p><details className="mt-2 text-xs"><summary>Technical details</summary>{error.code}: {error.backendMessage}</details></div> : null}
          <AlertDialogFooter><Button variant="outline" className="rounded-[2px]" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</Button><Button className="rounded-[2px]" disabled={!eligible || mutation.isPending} onClick={() => void confirm()}>{mutation.isPending ? "Updating…" : "Confirm Ready for Submission"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
