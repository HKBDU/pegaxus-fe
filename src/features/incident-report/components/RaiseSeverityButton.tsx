import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import {
  INCIDENT_ACTION,
  INCIDENT_ERROR_MESSAGES,
  INCIDENT_SEVERITY,
  INCIDENT_SEVERITY_OPTIONS,
} from "@/shared/constants/incident";
import type {
  IncidentAction,
  IncidentMutationResponse,
  IncidentSeverity,
} from "@/shared/types/incident";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { useIncidentMutations } from "../hooks/useIncidentMutations";

const severityOrder: IncidentSeverity[] = [
  INCIDENT_SEVERITY.LOW,
  INCIDENT_SEVERITY.MEDIUM,
  INCIDENT_SEVERITY.HIGH,
  INCIDENT_SEVERITY.CRITICAL,
];

export interface RaiseSeverityButtonProps {
  incidentReportId: string;
  severity: IncidentSeverity;
  lastUpdatedAt: string;
  availableActions: IncidentAction[];
  onChanged?: (response: IncidentMutationResponse) => void;
  /** Lets the page size the button like the other actions of its bar. */
  className?: string;
  /** Controlled dialog, so a page can open it from a menu item instead of this component's own button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render only the dialog; the page provides its own trigger (for example a menu item). */
  hideTrigger?: boolean;
}

export function RaiseSeverityButton({
  incidentReportId,
  severity,
  lastUpdatedAt,
  availableActions,
  onChanged,
  className,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: RaiseSeverityButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [nextSeverity, setNextSeverity] = useState<IncidentSeverity>(
    INCIDENT_SEVERITY.HIGH,
  );
  const [reason, setReason] = useState("");
  const mutation = useIncidentMutations().raiseSeverity;
  const canRaise = availableActions.includes(INCIDENT_ACTION.RAISE_SEVERITY);
  const canLower = availableActions.includes(INCIDENT_ACTION.LOWER_SEVERITY);
  const selectableSeverities = useMemo(
    () => severityOrder.slice(severityOrder.indexOf(severity) + 1),
    [severity],
  );
  const allowedSeverities = canLower
    ? severityOrder.filter((option) => option !== severity)
    : selectableSeverities;
  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;

  if ((!canRaise && !canLower) || allowedSeverities.length === 0) return null;

  // Opened from a page's menu, the trigger's reset does not run: fall back to the first allowed value.
  const selectedSeverity = allowedSeverities.includes(nextSeverity) ? nextSeverity : allowedSeverities[0];

  const submit = () => {
    const isLowering = severityOrder.indexOf(selectedSeverity) < severityOrder.indexOf(severity);
    if (
      reason.trim().length < 10 ||
      !allowedSeverities.includes(selectedSeverity) ||
      (isLowering && !canLower)
    ) return;
    mutation.mutate(
      {
        incidentReportId,
        input: { lastUpdatedAt, severity: selectedSeverity, reason: reason.trim() },
      },
      {
        onSuccess: (response) => {
          setOpen(false);
          setReason("");
          onChanged?.(response);
        },
      },
    );
  };

  return (
    <>
      {hideTrigger ? null : (
        <Button
          type="button"
          onClick={() => {
            setNextSeverity(allowedSeverities[0]);
            setOpen(true);
          }}
          variant={className ? "outline" : "default"}
          className={cn("min-h-12 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]", className)}
        >
          <ArrowUpDown className="size-4" aria-hidden="true" />
          Change severity
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[2px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change incident severity</DialogTitle>
            <DialogDescription>
              {canLower
                ? "Logistics Manager can move severity up or down."
                : "Severity can only move upward."}{" "}
              The current value is{" "}
              {INCIDENT_SEVERITY_OPTIONS[severity].label}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              New severity
              <Select
                value={selectedSeverity}
                onValueChange={(value) =>
                  setNextSeverity(value as IncidentSeverity)
                }
              >
                <SelectTrigger className="min-h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedSeverities.map((option) => (
                    <SelectItem key={option} value={option}>
                      {INCIDENT_SEVERITY_OPTIONS[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Reason{" "}
              <span className="font-normal text-slate-500">
                Minimum 10 characters
              </span>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={reasonTooShort}
              />
            </label>
          </div>
          {reasonTooShort && (
            <p className="text-sm text-red-600">
              Reason must be at least 10 characters.
            </p>
          )}
          {mutation.error instanceof Error && (
            <p role="alert" className="text-sm text-red-600">
              {INCIDENT_ERROR_MESSAGES[
                (mutation.error as { errorCode?: string }).errorCode ?? ""
              ] ?? mutation.error.message}
            </p>
          )}
          {mutation.data?.effects?.customerNotified && (
            <p
              role="status"
              className="bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              Customer was notified.
            </p>
          )}
          {mutation.data?.effects?.vehicleStatusChanged && (
            <p
              role="status"
              className="border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800"
            >
              Vehicle status was updated by this incident change.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending || reason.trim().length < 10}
              onClick={submit}
              className="bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
            >
              {mutation.isPending ? "Saving…" : "Change severity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
