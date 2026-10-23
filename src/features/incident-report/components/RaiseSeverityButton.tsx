import { useMemo, useState } from "react";

import {
  INCIDENT_ACTION,
  INCIDENT_SEVERITY,
  INCIDENT_SEVERITY_OPTIONS,
} from "@/shared/constants/incident";
import type {
  IncidentAction,
  IncidentMutationResponse,
  IncidentSeverity,
} from "@/shared/types/incident";
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
}

export function RaiseSeverityButton({
  incidentReportId,
  severity,
  lastUpdatedAt,
  availableActions,
  onChanged,
}: RaiseSeverityButtonProps) {
  const [open, setOpen] = useState(false);
  const [nextSeverity, setNextSeverity] = useState<IncidentSeverity>(
    INCIDENT_SEVERITY.HIGH,
  );
  const [reason, setReason] = useState("");
  const mutation = useIncidentMutations().raiseSeverity;
  const canRaise = availableActions.includes(INCIDENT_ACTION.RAISE_SEVERITY);
  const higherSeverities = useMemo(
    () => severityOrder.slice(severityOrder.indexOf(severity) + 1),
    [severity],
  );
  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;

  if (!canRaise || higherSeverities.length === 0) return null;

  const submit = () => {
    if (reason.trim().length < 10 || !higherSeverities.includes(nextSeverity))
      return;
    mutation.mutate(
      {
        incidentReportId,
        input: { lastUpdatedAt, severity: nextSeverity, reason: reason.trim() },
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
      <Button
        type="button"
        onClick={() => {
          setNextSeverity(higherSeverities[0]);
          setOpen(true);
        }}
        className="min-h-12 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
      >
        Raise severity
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[2px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise incident severity</DialogTitle>
            <DialogDescription>
              Severity can only move upward. The current value is{" "}
              {INCIDENT_SEVERITY_OPTIONS[severity].label}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              New severity
              <Select
                value={nextSeverity}
                onValueChange={(value) =>
                  setNextSeverity(value as IncidentSeverity)
                }
              >
                <SelectTrigger className="min-h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {higherSeverities.map((option) => (
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
              {mutation.error.message}
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
              {mutation.isPending ? "Saving…" : "Raise severity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
