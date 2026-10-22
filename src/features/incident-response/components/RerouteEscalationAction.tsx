import { useEffect, useRef, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogTrigger } from "@/shared/components/ui/dialog";
import { useRerouteEscalation } from "../hooks/useRerouteEscalation";
import {
  canEscalateReroute,
  getRerouteEscalationError,
} from "../reroute-services";
import { emergencyCostAuthScope } from "../services";
import type {
  RerouteContext,
  RerouteEscalationRequest,
} from "../reroute-schemas";
import { RerouteEscalationDialog } from "./RerouteEscalationDialog";

export function RerouteEscalationAction({
  context,
  scope,
  queryKey,
  refreshing,
}: {
  context: RerouteContext;
  scope: string;
  queryKey: QueryKey;
  refreshing: boolean;
}) {
  const principal = useAuthStore((state) => state.principal);
  const mutation = useRerouteEscalation(scope, queryKey);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RerouteEscalationRequest>();
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{
    message: string;
    eligible: boolean;
  }>();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const allowed = canEscalateReroute(principal, context);
  const error = mutation.isError
    ? getRerouteEscalationError(mutation.error)
    : null;
  const blocked =
    refreshing || verifying || !allowed || Boolean(error?.blocked);
  async function submit(request: RerouteEscalationRequest) {
    if (blocked || mutation.isPending || emergencyCostAuthScope() !== scope)
      return;
    setDraft(request);
    try {
      await mutation.mutateAsync({ context, request });
      if (mounted.current && emergencyCostAuthScope() === scope) setOpen(false);
    } catch {
      // Keep form values; conflicts and uncertain delivery are never resubmitted automatically.
    }
  }
  async function verify() {
    if (verifying || mutation.isPending || emergencyCostAuthScope() !== scope)
      return;
    setVerifying(true);
    setVerification(undefined);
    try {
      const latest = await mutation.verifyContext(
        context.incident.incidentReportId,
      );
      if (mounted.current && emergencyCostAuthScope() === scope)
        setVerification({
          eligible: canEscalateReroute(
            useAuthStore.getState().principal,
            latest,
          ),
          message: `Latest incident status: ${latest.incident.status}. RT1 does not provide an escalation delivery receipt. Check with Logistics Management before considering another attempt.`,
        });
    } catch {
      if (mounted.current && emergencyCostAuthScope() === scope)
        setVerification({
          eligible: false,
          message:
            "The latest context could not be verified. Your draft remains locked and preserved.",
        });
    } finally {
      if (mounted.current) setVerifying(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (
          mutation.isPending ||
          verifying ||
          (value && (!allowed || refreshing))
        )
          return;
        if (value && !error?.outcomeUnknown) {
          mutation.reset();
          setDraft(undefined);
          setVerification(undefined);
        }
        setOpen(value);
      }}
    >
      {allowed && (
        <DialogTrigger asChild>
          <Button
            type="button"
            disabled={refreshing || mutation.isPending || verifying}
            className="min-h-11 w-full whitespace-normal rounded-[2px] font-heading text-sm uppercase sm:min-h-9"
          >
            <Send aria-hidden="true" className="size-3.5" />
            {error?.outcomeUnknown
              ? "Review Escalation Outcome"
              : "Escalate to Logistics Manager"}
          </Button>
        </DialogTrigger>
      )}
      {open && (
        <RerouteEscalationDialog
          context={context}
          busy={mutation.isPending}
          blocked={blocked}
          initialRequest={draft}
          uncertain={error?.outcomeUnknown}
          verifying={verifying}
          verificationMessage={verification?.message}
          onVerify={() => void verify()}
          onReview={
            verification?.eligible && allowed && !refreshing
              ? () => {
                  mutation.reset();
                  setVerification(undefined);
                }
              : undefined
          }
          feedback={
            error?.message ??
            (!allowed
              ? "This context no longer permits escalation. Close and review the latest incident state."
              : undefined)
          }
          onClose={() => {
            if (!mutation.isPending && !verifying) setOpen(false);
          }}
          onSubmit={submit}
        />
      )}
    </Dialog>
  );
}
