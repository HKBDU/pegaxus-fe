import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { canCancelRoutePlan } from "@/shared/constants/route-plan-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cancelRoutePlan, getRoutePlanError } from "../services";
import type { RoutePlanMutationResult, RoutePlanStatus } from "../types";

type CancelRoutePlanDialogProps = {
  routePlanId: string;
  status: RoutePlanStatus;
  lastUpdatedAt: string;
  routePlanCode?: string;
  children?: ReactNode;
  onCancelled?: (result: RoutePlanMutationResult) => void;
};

export function CancelRoutePlanDialog({
  routePlanId,
  status,
  lastUpdatedAt,
  routePlanCode,
  children,
  onCancelled,
}: CancelRoutePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!canCancelRoutePlan(status)) return null;

  function reset() {
    setReason("");
    setError(null);
  }

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("Cancellation reason is required.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await cancelRoutePlan(routePlanId, {
        lastUpdatedAt,
        reason: normalizedReason,
      });
      setOpen(false);
      reset();
      toast.success("Route plan cancelled successfully.");
      onCancelled?.(result);
    } catch (requestError) {
      const mapped = getRoutePlanError(requestError);
      setError(mapped.message);
      toast.error(mapped.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <AlertDialogTrigger asChild>
        {children ?? (
          <Button type="button" variant="destructive">
            Cancel route plan
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle>
            Cancel {routePlanCode ?? "route plan"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This only cancels the DRAFT route plan. Booking and Transport Plan
            status will not change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <label
            htmlFor="route-plan-cancel-reason"
            className="text-sm font-medium"
          >
            Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="route-plan-cancel-reason"
            value={reason}
            disabled={isPending}
            aria-invalid={!!error}
            placeholder="Why is this route plan being cancelled?"
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Keep route plan
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => void handleConfirm(event)}
          >
            {isPending ? "Cancelling…" : "Cancel route plan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
