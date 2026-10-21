import { Ban, PlayCircle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { CancelHandoverDialog } from "../components/CancelHandoverDialog";
import { CompleteForm } from "../components/CompleteForm";
import { PageFrame } from "../components/PageFrame";
import { PartiesSection } from "../components/PartyBlock";
import { ReadOnlyRecord } from "../components/ReadOnlyRecord";
import { RecordSummary } from "../components/RecordSummary";
import { ReloadDialog } from "../components/ReloadDialog";
import { StatusBadge } from "../components/StatusBadge";
import { handoverPaths, type HandoverAudience } from "../constants";
import {
  useCancelHandover,
  useCompleteHandover,
  useHandoverRecord,
  useReloadHandover,
  useStartHandover,
  useTransportSegments,
} from "../hooks/useHandovers";
import { HandoverApiError } from "../services";
import type { CompleteInput, HandoverRecord } from "../types";
import { canOperateHandover, describeError, hasAction } from "../utils";

const isModified = (error: unknown) =>
  error instanceof HandoverApiError && error.errorCode === "HANDOVER_MODIFIED";

/** The point where the handover happens: the start of the next leg, or the end of the previous one. */
function handoverPoint(
  record: HandoverRecord,
  legs: Array<{
    routePlanRouteId: string;
    fromLocation: {
      latitude?: number | null;
      longitude?: number | null;
      locationName: string;
    };
    toLocation: {
      latitude?: number | null;
      longitude?: number | null;
      locationName: string;
    };
  }>,
) {
  const next = record.toSegment
    ? legs.find(
        (leg) => leg.routePlanRouteId === record.toSegment?.routePlanRouteId,
      )?.fromLocation
    : undefined;
  const previous = record.fromSegment
    ? legs.find(
        (leg) => leg.routePlanRouteId === record.fromSegment?.routePlanRouteId,
      )?.toLocation
    : undefined;
  const place =
    previous?.latitude != null && previous.longitude != null ? previous : next;
  if (place?.latitude == null || place.longitude == null) return null;
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    name: record.location.locationName ?? place.locationName,
  };
}

/**
 * One page for view, start, complete (the edit step) and cancel of a record. What the person can do comes only from
 * `availableActions` of the record: START, COMPLETE, CANCEL.
 */
export default function HandoverRecordPage({
  audience,
}: {
  audience: HandoverAudience;
}) {
  const { transportId = "", bookingId, handoverId } = useParams();
  const navigate = useNavigate();
  const recordQuery = useHandoverRecord(handoverId);
  const record = recordQuery.data;
  const principal = useAuthStore((state) => state.principal);
  const session = useAuthStore((state) => state.sessionVersion);
  const scope = `${session}:${transportId}:${handoverId ?? ""}`;
  const currentScope = useRef<{ key: string } | null>({ key: scope });
  useLayoutEffect(() => {
    currentScope.current = { key: scope };
    return () => {
      currentScope.current = null;
    };
  }, [scope]);
  const operator = audience !== "customer" && canOperateHandover(principal);
  const canComplete = Boolean(
    operator &&
    record?.status === "IN_PROGRESS" &&
    hasAction(record, "COMPLETE"),
  );

  const segments = useTransportSegments(
    transportId,
    canComplete && audience !== "customer",
  );
  const start = useStartHandover(transportId, handoverId ?? "");
  const complete = useCompleteHandover(transportId, handoverId ?? "");
  const cancel = useCancelHandover(transportId, handoverId ?? "");
  const reload = useReloadHandover(transportId, handoverId ?? "");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [completion, setCompleted] = useState<{
    record: HandoverRecord;
    session: number;
  } | null>(null);
  const completed = completion?.session === session ? completion.record : null;

  const back = handoverPaths.list(audience, transportId, bookingId);
  const mobile = audience === "crew";
  const modified =
    isModified(start.error) ||
    isModified(complete.error) ||
    isModified(cancel.error);

  const onReload = () => {
    start.reset();
    complete.reset();
    cancel.reset();
    setCancelOpen(false);
    reload();
  };

  const submitComplete = async (input: CompleteInput) => {
    const activeScope = currentScope.current;
    if (activeScope?.key !== scope) return;
    if (!canComplete) return;
    const done = await complete.mutateAsync(input);
    if (
      useAuthStore.getState().sessionVersion !== session ||
      currentScope.current !== activeScope
    )
      return;
    setCompleted({ record: done, session });
    toast.success("Handover completed.");
  };

  const submitCancel = async (reason: string) => {
    const activeScope = currentScope.current;
    if (activeScope?.key !== scope) return;
    if (!record || !hasAction(record, "CANCEL")) return;
    try {
      await cancel.mutateAsync({
        lastUpdatedAt: record.updatedAt,
        cancellationReason: reason,
      });
      if (
        useAuthStore.getState().sessionVersion !== session ||
        currentScope.current !== activeScope
      )
        return;
      setCancelOpen(false);
      toast.success("Handover cancelled.");
    } catch (error) {
      if (
        currentScope.current !== activeScope ||
        useAuthStore.getState().sessionVersion !== session
      )
        return;
      if (isModified(error)) setCancelOpen(false);
    }
  };

  const doStart = async () => {
    const activeScope = currentScope.current;
    if (activeScope?.key !== scope) return;
    if (
      !record ||
      !operator ||
      record.status !== "PLANNED" ||
      !hasAction(record, "START")
    )
      return;
    try {
      await start.mutateAsync(record.handoverRecordId);
      if (
        useAuthStore.getState().sessionVersion !== session ||
        currentScope.current !== activeScope
      )
        return;
      toast.success("Handover is now in progress.");
    } catch {
      // The error is shown from `start.error` below.
    }
  };

  const status = record ? <StatusBadge status={record.status} /> : null;
  const shown =
    record &&
    completed &&
    completed.handoverRecordId === record.handoverRecordId
      ? { ...record, effects: completed.effects ?? record.effects }
      : record;

  const barClass = cn(
    "flex gap-2",
    mobile
      ? "fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] [&>button]:min-h-15 [&>button]:flex-1 [&>button]:text-base"
      : "flex-col-reverse sm:flex-row sm:justify-end [&>button]:min-h-11 sm:[&>button]:min-h-10",
  );

  return (
    <PageFrame
      audience={audience}
      title="Handover record"
      backHref={back}
      backLabel="Return to handover records"
      action={status}
    >
      {recordQuery.isPending ? (
        <LoadingState />
      ) : recordQuery.isError || !shown ? (
        <ErrorState
          message={describeError(
            recordQuery.error,
            "The handover record could not be loaded.",
          )}
          onRetry={() => void recordQuery.refetch()}
        />
      ) : (
        <>
          {canComplete ? (
            <CompleteForm
              key={`${session}:${principal?.id}:${shown.handoverRecordId}:${shown.updatedAt}`}
              record={shown}
              mobile={mobile}
              pending={complete.isPending}
              target={
                shown.geofence
                  ? {
                      ...shown.geofence,
                      name: shown.location.locationName ?? undefined,
                    }
                  : segments.data
                    ? handoverPoint(shown, segments.data.segments)
                    : null
              }
              onSubmit={submitComplete}
              onBack={() => navigate(back)}
              submitError={complete.error}
              onClearSubmitError={() => complete.reset()}
            />
          ) : shown.status === "PLANNED" ? (
            <div className="space-y-4">
              <RecordSummary record={shown} />
              <PartiesSection
                from={{ party: shown.from }}
                to={{ party: shown.to }}
              />
              <p className="rounded-[2px] border border-slate-300 bg-white px-3 py-2 text-sm text-gray-600">
                This handover is planned. Start it when the parties are at the
                handover point; then you can fill it in and collect the
                signatures.
              </p>
            </div>
          ) : (
            <ReadOnlyRecord
              record={shown}
              onReloadSignatures={() => void recordQuery.refetch()}
              reloadingSignatures={recordQuery.isFetching}
              justCompleted={Boolean(
                completed &&
                completed.handoverRecordId === shown.handoverRecordId,
              )}
            />
          )}

          {start.error && !modified ? (
            <p
              role="alert"
              className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {describeError(start.error)}
            </p>
          ) : null}

          {operator &&
          shown.status === "PLANNED" &&
          hasAction(shown, "START") ? (
            <div className={barClass}>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(back)}
                disabled={start.isPending}
                className="rounded-[2px]"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => void doStart()}
                disabled={start.isPending}
                className="gap-2 rounded-[2px] font-heading font-semibold tracking-[0.06em] uppercase shadow-[0.125rem_0.125rem_0_0_rgb(0_0_0/0.85)]"
              >
                <PlayCircle aria-hidden="true" className="size-4" />
                {start.isPending ? "Starting…" : "Start handover"}
              </Button>
            </div>
          ) : null}

          {hasAction(shown, "CANCEL") ? (
            <section
              aria-label="Cancel handover"
              className={cn(
                "flex flex-col gap-2 rounded-[2px] border border-red-200 bg-red-50/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4",
                mobile && "mb-4",
              )}
            >
              <p className="text-sm text-red-900">
                Cannot hand over here? Cancel this handover point and tell the
                team why.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  cancel.reset();
                  setCancelOpen(true);
                }}
                className="min-h-12 shrink-0 gap-2 rounded-[2px] border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-700 sm:min-h-9"
              >
                <Ban aria-hidden="true" className="size-4" />
                Cancel handover
              </Button>
            </section>
          ) : null}

          <CancelHandoverDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            code={shown.handoverCode}
            pending={cancel.isPending}
            serverError={
              cancel.error && !modified
                ? describeError(cancel.error)
                : undefined
            }
            onSubmit={(reason) => void submitCancel(reason)}
          />
        </>
      )}
      <ReloadDialog open={modified} onReload={onReload} />
    </PageFrame>
  );
}
