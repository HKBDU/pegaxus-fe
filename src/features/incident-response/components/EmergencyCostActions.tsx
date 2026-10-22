import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { useEmergencyCostAction } from "../hooks/useEmergencyCostAction";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import type { EmergencyCostDetail } from "../schemas";
import {
  canCancelEmergencyCost,
  canDecideEmergencyCost,
  emergencyCostAuthScope,
  getEmergencyCostError,
  type EmergencyCostActionSubmission,
} from "../services";
import {
  CancelCostDialog,
  DecisionCostDialog,
} from "./EmergencyCostActionDialogs";

export function EmergencyCostActions({
  request,
  refreshing,
  onReload,
  onChanged,
  decisionAllowed = true,
}: {
  request: EmergencyCostDetail;
  refreshing: boolean;
  onReload: () => void;
  onChanged?: () => void | Promise<void>;
  decisionAllowed?: boolean;
}) {
  const { principal, scope } = useEmergencyCostScope();
  const mutation = useEmergencyCostAction();
  const [dialog, setDialog] = useState<{
    action: "cancel" | "decision";
    snapshot: EmergencyCostDetail;
  } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedVersion, setVerifiedVersion] = useState<string>();
  const [verificationMessage, setVerificationMessage] = useState<string>();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const cancel = canCancelEmergencyCost(principal, request);
  const decide = decisionAllowed && canDecideEmergencyCost(principal, request);
  const error = mutation.isError
    ? getEmergencyCostError(mutation.error, dialog?.action ?? "detail")
    : null;
  const stale = Boolean(
    dialog &&
    (request.updatedAt !== dialog.snapshot.updatedAt ||
      request.emergencyCostRequestId !==
        dialog.snapshot.emergencyCostRequestId),
  );
  const allowed = dialog?.action === "cancel" ? cancel : decide;
  const blocked =
    refreshing ||
    verifying ||
    stale ||
    !allowed ||
    Boolean(
      error?.conflict || error?.outcomeUnknown || error?.submissionBlocked,
    );
  const feedback = error
    ? `${error.message} Current displayed status: ${request.status}.`
    : stale || (dialog && !allowed)
      ? `This request is now ${request.status} or its version/permissions have changed. Close this dialog and review the latest details.`
      : undefined;
  const reloadProps = {
    refreshing: refreshing || verifying,
    verificationMessage,
    onReview:
      error?.outcomeUnknown &&
      verifiedVersion === request.updatedAt &&
      allowed &&
      !refreshing &&
      !verifying
        ? () => {
            mutation.reset();
            setDialog((current) =>
              current ? { ...current, snapshot: request } : null,
            );
            setVerifiedVersion(undefined);
            setVerificationMessage(undefined);
          }
        : undefined,
    onReload: error?.outcomeUnknown
      ? () => void verify()
      : error?.conflict || stale
        ? onReload
        : undefined,
  };
  async function verify() {
    if (verifying || mutation.isPending) return;
    setVerifying(true);
    setVerifiedVersion(undefined);
    try {
      const latest = await mutation.verifyRequest(
        request.emergencyCostRequestId,
      );
      if (mounted.current && emergencyCostAuthScope() === scope) {
        setVerifiedVersion(latest.updatedAt);
        setVerificationMessage(
          `Latest server status: ${latest.status}. A pending status does not prove the earlier request was never received; review before another attempt.`,
        );
      }
    } catch {
      if (mounted.current && emergencyCostAuthScope() === scope)
        setVerificationMessage(
          "The latest request could not be verified. Your draft remains locked and preserved.",
        );
    } finally {
      if (mounted.current) setVerifying(false);
    }
  }
  function close() {
    if (mutation.isPending || verifying) return;
    setOpenDialog(false);
    if (!error?.outcomeUnknown) setDialog(null);
  }
  function open(action: "cancel" | "decision") {
    if (
      refreshing ||
      mutation.isPending ||
      verifying ||
      !(action === "cancel" ? cancel : decide)
    )
      return;
    if (error?.outcomeUnknown && dialog) {
      setOpenDialog(true);
      return;
    }
    mutation.reset();
    setVerifiedVersion(undefined);
    setVerificationMessage(undefined);
    setDialog({ action, snapshot: request });
    setOpenDialog(true);
  }
  async function submit(submission: EmergencyCostActionSubmission) {
    if (blocked || mutation.isPending || emergencyCostAuthScope() !== scope)
      return;
    try {
      await mutation.mutateAsync(submission);
      if (mounted.current && emergencyCostAuthScope() === scope) {
        setDialog(null);
        toast.success(
          submission.action === "cancel"
            ? "Emergency cost request cancelled."
            : "Emergency cost decision saved.",
        );
        try {
          await onChanged?.();
        } catch {
          if (mounted.current && emergencyCostAuthScope() === scope)
            toast.error(
              "The decision is saved, but the incident could not be refreshed. Reload its context.",
            );
        }
      }
    } catch {
      // Unknown outcomes retain the draft and require an explicit read/review, never an automatic POST retry.
    }
  }
  return (
    <section aria-label="Emergency cost actions" className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {cancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={refreshing || mutation.isPending || verifying}
            onClick={() => open("cancel")}
            className="min-h-11 rounded-[2px] border-destructive/40 text-destructive sm:min-h-9"
          >
            {error?.outcomeUnknown
              ? "Review cancellation outcome"
              : "Cancel request"}
          </Button>
        ) : null}
        {decide ? (
          <Button
            type="button"
            disabled={refreshing || mutation.isPending || verifying}
            onClick={() => open("decision")}
            className="min-h-11 rounded-[2px] sm:min-h-9"
          >
            {error?.outcomeUnknown
              ? "Review decision outcome"
              : "Review request"}
          </Button>
        ) : null}
      </div>
      {error && !dialog ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      {dialog?.action === "cancel" ? (
        <CancelCostDialog
          {...reloadProps}
          open={openDialog}
          snapshot={dialog.snapshot}
          busy={mutation.isPending}
          blocked={blocked}
          feedback={feedback}
          onClose={close}
          onSubmit={(input) =>
            submit({
              action: "cancel",
              snapshot: dialog.snapshot,
              request: input,
            })
          }
        />
      ) : null}
      {dialog?.action === "decision" ? (
        <DecisionCostDialog
          {...reloadProps}
          open={openDialog}
          snapshot={dialog.snapshot}
          busy={mutation.isPending}
          blocked={blocked}
          feedback={feedback}
          onClose={close}
          onSubmit={(input) =>
            submit({
              action: "decision",
              snapshot: dialog.snapshot,
              request: input,
            })
          }
        />
      ) : null}
    </section>
  );
}
