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
  const blocked = refreshing || !allowed || Boolean(error?.blocked);
  async function submit(request: RerouteEscalationRequest) {
    if (blocked || mutation.isPending || emergencyCostAuthScope() !== scope)
      return;
    try {
      await mutation.mutateAsync({ context, request });
      if (mounted.current && emergencyCostAuthScope() === scope) setOpen(false);
    } catch {
      // Keep form values; conflicts and uncertain delivery are never resubmitted automatically.
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (mutation.isPending || (value && (!allowed || refreshing))) return;
        if (value) mutation.reset();
        setOpen(value);
      }}
    >
      {allowed && (
        <DialogTrigger asChild>
          <Button
            type="button"
            disabled={refreshing || mutation.isPending}
            className="min-h-11 w-full rounded-[2px] font-heading text-xs uppercase sm:min-h-9"
          >
            <Send aria-hidden="true" className="size-3.5" />
            Escalate to LM
          </Button>
        </DialogTrigger>
      )}
      {open && (
        <RerouteEscalationDialog
          context={context}
          busy={mutation.isPending}
          blocked={blocked}
          feedback={
            error?.message ??
            (!allowed
              ? "This context no longer permits escalation. Close and review the latest incident state."
              : undefined)
          }
          onClose={() => {
            if (!mutation.isPending) setOpen(false);
          }}
          onSubmit={submit}
        />
      )}
    </Dialog>
  );
}
