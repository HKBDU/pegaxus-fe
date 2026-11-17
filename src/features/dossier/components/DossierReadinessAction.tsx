import { useState } from "react";
import { toast } from "sonner";
import { useDossierRole } from "../hooks/useDossierRole";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useReadyForSubmission } from "../hooks/useReadyForSubmission";
import {
  canMarkReadyForSubmission,
  mapDocumentReviewError,
} from "../lib/document-review";
import type { DocumentReviewError, DossierOverview } from "../types";

export function DossierReadinessAction({
  dossier,
  onCompleted,
  onAddRequirement,
  onRequestReupload,
}: {
  dossier: DossierOverview;
  onCompleted?: () => void;
  /** Shortcuts shown while an authority's rejection or request for information waits for the specialist. */
  onAddRequirement?: () => void;
  onRequestReupload?: () => void;
}) {
  const role = useDossierRole("TRANSPORT_SPECIALIST");
  const eligible = canMarkReadyForSubmission(role, dossier);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<DocumentReviewError | null>(null);
  const mutation = useReadyForSubmission();
  async function confirm() {
    if (!eligible || mutation.isPending) return;
    setError(null);
    try {
      const attempt = await mutation.markReady(
        String(dossier.complianceDossierId),
      );
      if (!attempt.started) return;
      toast.success(attempt.value.message);
      setOpen(false);
      onCompleted?.();
    } catch (failure) {
      const mapped = mapDocumentReviewError(failure);
      setError(mapped);
      toast.error(mapped.message);
    }
  }
  const revision = dossier.pendingAuthorityRevision;
  return (
    <>
      {revision &&
      role &&
      ["IN_PREPARATION", "REJECTED"].includes(dossier.status) ? (
        <div
          role="status"
          className="rounded-[2px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"
        >
          <p className="m-0 font-semibold">
            {revision.authorityName}{" "}
            {revision.decision === "REJECTED"
              ? "rejected this dossier."
              : "asked for more information."}
          </p>
          <p className="m-0 mt-1">
            Add the requirement the authority asked for, or ask the customer to
            upload the documents it flagged again. The dossier can be marked
            ready for submission again after that.
          </p>
          {onAddRequirement || onRequestReupload ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onAddRequirement ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-[2px] border-amber-300 bg-white"
                  onClick={onAddRequirement}
                >
                  Add requirement
                </Button>
              ) : null}
              {onRequestReupload ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-[2px] border-amber-300 bg-white"
                  onClick={onRequestReupload}
                >
                  Request re-upload
                </Button>
              ) : null}
            </div>
          ) : null}
          {onRequestReupload ? (
            <p className="m-0 mt-2 text-[11px] text-amber-800">
              Request re-upload opens Documents / Reviews: choose Request
              Re-upload in the actions menu of each document the authority
              flagged.
            </p>
          ) : null}
        </div>
      ) : null}
      {eligible ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs text-emerald-800">
            All mandatory requirements are complete. The dossier can be marked
            ready for submission.
          </p>
          <Button
            className="rounded-[2px]"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            Mark Ready for Submission
          </Button>
        </div>
      ) : null}
      <AlertDialog
        open={open}
        onOpenChange={(value) => !mutation.isPending && setOpen(value)}
      >
        <AlertDialogContent className="rounded-[2px] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl">
              Mark dossier ready for submission?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All mandatory requirements must be complete. This only changes the
              dossier state to READY_FOR_SUBMISSION. It does NOT submit anything
              to an authority.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!eligible ? (
            <p role="alert" className="text-sm text-red-700">
              Dossier eligibility has changed. Refresh and check the current
              progress.
            </p>
          ) : null}
          {error ? (
            <div role="alert" className="text-sm text-red-700">
              <p>{error.message}</p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <Button
              variant="outline"
              className="rounded-[2px]"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-[2px]"
              disabled={!eligible || mutation.isPending}
              onClick={() => void confirm()}
            >
              {mutation.isPending
                ? "Updating…"
                : "Confirm Ready for Submission"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
