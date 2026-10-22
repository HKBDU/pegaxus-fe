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
}: {
  request: EmergencyCostDetail;
  refreshing: boolean;
  onReload: () => void;
}) {
  const { principal, scope } = useEmergencyCostScope();
  const mutation = useEmergencyCostAction();
  const [dialog, setDialog] = useState<{
    action: "cancel" | "decision";
    snapshot: EmergencyCostDetail;
  } | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const cancel = canCancelEmergencyCost(principal, request);
  const decide = canDecideEmergencyCost(principal, request);
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
    stale ||
    !allowed ||
    Boolean(
      error?.conflict || error?.outcomeUnknown || error?.submissionBlocked,
    );
  const feedback = error
    ? `${error.message} Current displayed status: ${request.status}. Close and review the refreshed request before another action.`
    : stale || (dialog && !allowed)
      ? `This request is now ${request.status} or its version/permissions have changed. Close this dialog and review the latest details.`
      : undefined;
  const reloadProps = {
    refreshing,
    onReload:
      error?.conflict || error?.outcomeUnknown || stale ? onReload : undefined,
  };
  function open(action: "cancel" | "decision") {
    if (
      refreshing ||
      mutation.isPending ||
      !(action === "cancel" ? cancel : decide)
    )
      return;
    mutation.reset();
    setDialog({ action, snapshot: request });
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
      }
    } catch {
      // The dialog keeps its values; the hook reloads server details for conflicts or uncertain outcomes.
    }
  }
  return (
    <section aria-label="Emergency cost actions" className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {cancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={refreshing || mutation.isPending}
            onClick={() => open("cancel")}
            className="min-h-11 rounded-[2px] border-destructive/40 text-destructive sm:min-h-9"
          >
            Cancel request
          </Button>
        ) : null}
        {decide ? (
          <Button
            type="button"
            disabled={refreshing || mutation.isPending}
            onClick={() => open("decision")}
            className="min-h-11 rounded-[2px] sm:min-h-9"
          >
            Review request
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
          snapshot={dialog.snapshot}
          busy={mutation.isPending}
          blocked={blocked}
          feedback={feedback}
          onClose={() => {
            if (!mutation.isPending) setDialog(null);
          }}
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
          snapshot={dialog.snapshot}
          busy={mutation.isPending}
          blocked={blocked}
          feedback={feedback}
          onClose={() => {
            if (!mutation.isPending) setDialog(null);
          }}
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
