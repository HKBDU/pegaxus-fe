import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { getRoutePlanError, submitLegalReview } from "../services";
import type { LegalReview, LegalReviewResult, RouteSegment } from "../types";

type FeasibilityStatus = "FEASIBLE" | "NOT FEASIBLE";

export type LegalFeasibilityPanelProps = {
  routePlanId: string;
  lastUpdatedAt: string;
  segments: Pick<RouteSegment, "sequenceNo" | "route">[];
  legalReview?: LegalReview | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirmed?: (result: LegalReviewResult) => void;
  trigger?: ReactNode;
};

function initialStatus(legalReview?: LegalReview | null): FeasibilityStatus {
  return legalReview?.isFeasible === false ? "NOT FEASIBLE" : "FEASIBLE";
}

function formatReviewedAt(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function LegalFeasibilityPanel({
  routePlanId,
  lastUpdatedAt,
  segments,
  legalReview,
  open,
  onOpenChange,
  onConfirmed,
  trigger,
}: LegalFeasibilityPanelProps) {
  const principal = useAuthStore((state) => state.principal);
  const canReview = canAccess(principal, {
    anyRole: ["TRANSPORT_SPECIALIST"],
  });
  const [internalOpen, setInternalOpen] = useState(open ?? !trigger);
  const [status, setStatus] = useState<FeasibilityStatus>(
    initialStatus(legalReview),
  );
  const [note, setNote] = useState(legalReview?.note ?? "");
  const [blockedSegments, setBlockedSegments] = useState<number[]>(
    legalReview?.blockedSegments ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const visibleOpen = open ?? internalOpen;
  const selectedSegments = useMemo(
    () =>
      segments.filter((segment) =>
        blockedSegments.includes(segment.sequenceNo),
      ),
    [blockedSegments, segments],
  );
  const availableSegments = segments.filter(
    (segment) => !blockedSegments.includes(segment.sequenceNo),
  );

  if (!canReview) return null;

  function setPanelOpen(nextOpen: boolean) {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function selectStatus(nextStatus: FeasibilityStatus) {
    setStatus(nextStatus);
    setError(null);
    if (nextStatus === "FEASIBLE") setBlockedSegments([]);
  }

  function addBlockedSegment(sequenceNo: number) {
    setBlockedSegments((current) =>
      current.includes(sequenceNo)
        ? current
        : [...current, sequenceNo].sort((a, b) => a - b),
    );
  }

  function removeBlockedSegment(sequenceNo: number) {
    setBlockedSegments((current) =>
      current.filter((item) => item !== sequenceNo),
    );
  }

  async function confirmReview() {
    const normalizedNote = note.trim();
    if (status === "NOT FEASIBLE" && !normalizedNote) {
      setError("Assessment note is required when the route is not feasible.");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const result = await submitLegalReview(routePlanId, {
        lastUpdatedAt,
        isFeasible: status === "FEASIBLE",
        note: normalizedNote || undefined,
        blockedSegments: status === "NOT FEASIBLE" ? blockedSegments : [],
      });
      toast.success("Route feasibility review saved.");
      onConfirmed?.(result);
      setPanelOpen(false);
    } catch (requestError) {
      const mapped = getRoutePlanError(requestError);
      setError(mapped.message);
      toast.error(mapped.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={visibleOpen} onOpenChange={setPanelOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton
        className="max-w-xl gap-0 rounded-none border-2 border-slate-300 bg-white p-4 sm:p-5"
      >
        <DialogTitle className="mb-4 flex items-center gap-2 pr-8 font-[var(--heading)] text-2xl uppercase tracking-wide">
          <span className="h-6 w-2 bg-[#f39200]" aria-hidden="true" />
          Route Feasibility
        </DialogTitle>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="min-h-20 bg-slate-100 p-3">
              <p className="text-xs font-medium uppercase tracking-wide">
                Status
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 h-auto w-full justify-between p-0 text-left font-bold hover:bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 bg-[#f39200]"
                        aria-hidden="true"
                      />
                      {status}
                    </span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-52">
                  <DropdownMenuRadioGroup
                    value={status}
                    onValueChange={(value) =>
                      selectStatus(value as FeasibilityStatus)
                    }
                  >
                    <DropdownMenuRadioItem value="FEASIBLE">
                      FEASIBLE
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="NOT FEASIBLE">
                      NOT FEASIBLE
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </section>

            <section className="min-h-20 bg-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide">
                  Blocked segments
                </p>
                {availableSegments.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Add blocked segment"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                      {availableSegments.map((segment) => (
                        <DropdownMenuItem
                          key={segment.sequenceNo}
                          onSelect={() => addBlockedSegment(segment.sequenceNo)}
                        >
                          Segment {segment.sequenceNo}:{" "}
                          {segment.route.routeName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedSegments.length ? (
                  selectedSegments.map((segment) => (
                    <span
                      key={segment.sequenceNo}
                      className="inline-flex items-center gap-1 bg-slate-800 px-2 py-1 text-xs font-semibold text-white"
                    >
                      SEGMENT {segment.sequenceNo}
                      <button
                        type="button"
                        onClick={() => removeBlockedSegment(segment.sequenceNo)}
                        aria-label={`Remove segment ${segment.sequenceNo}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </section>
          </div>

          <section className="bg-slate-100 p-3">
            <label
              htmlFor="legal-feasibility-note"
              className="text-xs font-medium uppercase tracking-wide"
            >
              Assessment note
              {status === "NOT FEASIBLE" && (
                <span className="text-destructive"> *</span>
              )}
            </label>
            <Textarea
              id="legal-feasibility-note"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Add assessment note"
              className="mt-2 min-h-20 resize-y rounded-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              aria-invalid={!!error}
            />
          </section>

          <section className="grid gap-2 bg-slate-100 p-3 text-sm">
            <ReviewerRow
              label="Reviewer"
              value={
                legalReview?.reviewedBy
                  ? `${legalReview.reviewedBy.fullName} (${legalReview.reviewedBy.employeeCode})`
                  : "—"
              }
            />
            <ReviewerRow
              label="Role"
              value={legalReview?.reviewedBy?.role ?? "Transport Specialist"}
            />
            <ReviewerRow
              label="Reviewed at"
              value={formatReviewedAt(legalReview?.reviewedAt)}
            />
          </section>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPanelOpen(false)}
              disabled={isPending}
              className="min-w-28 font-semibold uppercase"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void confirmReview()}
              disabled={isPending}
              className="min-w-40 rounded-none bg-[#f39200] font-semibold uppercase text-black hover:bg-[#d98000]"
            >
              {isPending ? (
                "Saving…"
              ) : (
                <>
                  <Check className="size-4" /> Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="uppercase text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
