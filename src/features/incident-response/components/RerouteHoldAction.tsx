import { useEffect, useRef, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { PauseCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { Dialog, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { formatPlanDate } from "@/features/transport-plan/format";
import { emergencyCostAuthScope } from "../services";
import { canHoldReroute, getRerouteHoldError } from "../reroute-services";
import { useRerouteHold } from "../hooks/useRerouteHold";
import type { RerouteContext, RerouteHoldRequest } from "../reroute-schemas";
import { RerouteHoldDialog } from "./RerouteHoldDialog";

export function RerouteHoldAction({
  context,
  scope,
  source,
  queryKey,
  refreshing,
}: {
  context: RerouteContext;
  scope: string;
  source: "real" | "mock";
  queryKey: QueryKey;
  refreshing: boolean;
}) {
  const principal = useAuthStore((state) => state.principal);
  const mutation = useRerouteHold(scope, queryKey);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RerouteHoldRequest>();
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
  const allowed = canHoldReroute(principal, context);
  const error = mutation.isError ? getRerouteHoldError(mutation.error) : null;
  const uncertain = Boolean(error?.outcomeUnknown);
  async function submit(request: RerouteHoldRequest) {
    if (
      !allowed ||
      refreshing ||
      mutation.isPending ||
      verifying ||
      error?.blocked ||
      emergencyCostAuthScope() !== scope
    )
      return;
    setDraft(request);
    try {
      await mutation.mutateAsync({ context, request });
      if (mounted.current && emergencyCostAuthScope() === scope) setOpen(false);
    } catch {
      /* The draft stays available; an uncertain result is not a confirmed rejection. */
    }
  }
  async function verify() {
    if (mutation.isPending || verifying || emergencyCostAuthScope() !== scope)
      return;
    setVerifying(true);
    setVerification(undefined);
    try {
      const latest = await mutation.verifyContext(
        context.incident.incidentReportId,
      );
      if (mounted.current && emergencyCostAuthScope() === scope)
        setVerification({
          eligible: canHoldReroute(useAuthStore.getState().principal, latest),
          message: latest.hold
            ? `Latest recorded hold: ${latest.hold.status}, until ${formatPlanDate(latest.hold.holdUntil)}.`
            : "The latest context has no recorded hold for this incident. This does not prove the earlier request was never received; review the situation before a new attempt.",
        });
    } catch {
      if (mounted.current && emergencyCostAuthScope() === scope)
        setVerification({
          eligible: false,
          message:
            "The latest context could not be verified. Keep this draft and check the connection or session.",
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
        if (value && !uncertain) {
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
            <PauseCircle aria-hidden="true" className="size-3.5" />
            {uncertain ? "Review Hold Outcome" : "Hold & Wait"}
          </Button>
        </DialogTrigger>
      )}
      {open && (
        <RerouteHoldDialog
          context={context}
          scope={scope}
          source={source}
          initialRequest={draft}
          busy={mutation.isPending}
          blocked={!allowed || refreshing || Boolean(error?.blocked)}
          feedback={
            error?.message ??
            (!allowed
              ? "This context no longer permits a new hold. Review the recorded decision."
              : undefined)
          }
          uncertain={uncertain}
          verifying={verifying}
          verificationMessage={verification?.message}
          canReview={Boolean(verification?.eligible) && allowed}
          onVerify={() => void verify()}
          onReview={() => {
            if (
              verification?.eligible &&
              allowed &&
              !refreshing &&
              !verifying
            ) {
              mutation.reset();
              setVerification(undefined);
            }
          }}
          onClose={() => {
            if (!mutation.isPending && !verifying) setOpen(false);
          }}
          onSubmit={submit}
        />
      )}
    </Dialog>
  );
}
