import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import type { IncidentAudience } from "@/shared/types/incident";
import { VndText } from "@/shared/components/incident";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { canAccess } from "@/features/auth/access-control";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import { useEmergencyCostDetail } from "../hooks/useEmergencyCostDetail";
import {
  emergencyCostIdSchema,
  emergencyCostIncidentSchema,
  type EmergencyCostIncident,
} from "../schemas";
import { canReadEmergencyCosts, getEmergencyCostError } from "../services";
import type { EmergencyCostAudience } from "../navigation";
import { EmergencyCostList } from "./EmergencyCostList";
import { EmergencyCostActions } from "./EmergencyCostActions";
import { EmergencyCostDetailSections } from "./EmergencyCostDetailSections";

export interface EmergencyCostSectionProps {
  incident: EmergencyCostIncident;
  audience: IncidentAudience;
  onChanged?: () => void | Promise<void>;
}

export function EmergencyCostSection(props: EmergencyCostSectionProps) {
  const { principal, signedIn, scope, source } = useEmergencyCostScope();
  if (
    props.audience === "CUSTOMER" ||
    !signedIn ||
    !canReadEmergencyCosts(principal)
  )
    return null;
  const parsed = emergencyCostIncidentSchema.safeParse(props.incident);
  if (
    !parsed.success ||
    !emergencyCostIdSchema.safeParse(parsed.data.incidentReportId).success
  )
    return (
      <ErrorState message="Valid internal incident context is required to load emergency costs." />
    );
  const admin = canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "TRANSPORT_SPECIALIST",
    ],
  });
  return (
    <CostSectionContent
      {...props}
      incident={parsed.data}
      routeAudience={admin ? "admin" : "crew"}
      key={`${source}:${scope}:${parsed.data.incidentReportId}`}
    />
  );
}

function CostSectionContent({
  incident,
  onChanged,
  routeAudience,
}: EmergencyCostSectionProps & { routeAudience: EmergencyCostAudience }) {
  const [requestId, setRequestId] = useState<string>();
  const { key, scope, source } = useEmergencyCostScope();
  const pending =
    useIsMutating({ mutationKey: [...key, "action"], exact: true }) > 0;
  const detail = useEmergencyCostDetail(requestId);
  const data = detail.isError ? undefined : detail.data;
  const error = detail.isError
    ? getEmergencyCostError(detail.error, "detail")
    : null;
  const mismatch =
    data &&
    data.request.incident.incidentReportId.toLowerCase() !==
      incident.incidentReportId.toLowerCase();
  return (
    <section
      aria-label="Incident emergency costs"
      className="min-w-0 space-y-3 rounded-[2px] border border-border bg-card p-3 sm:p-4"
    >
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="m-0 font-heading text-xl uppercase">Emergency costs</h2>
        <p className="m-0 text-xs text-muted-foreground">
          Incident approved total:{" "}
          {incident.costSummary ? (
            <VndText amount={incident.costSummary.approvedTotal} />
          ) : (
            "Not supplied"
          )}
        </p>
      </header>
      <EmergencyCostList
        incidentReportId={incident.incidentReportId}
        embedded
        hideHeading
        audience="INTERNAL"
        routeAudience={routeAudience}
        onOpenRequest={(item) => setRequestId(item.emergencyCostRequestId)}
      />
      <Dialog
        open={Boolean(requestId)}
        onOpenChange={(open) => {
          if (!open && !pending) setRequestId(undefined);
        }}
      >
        <DialogContent
          showCloseButton={!pending}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          className="max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto rounded-[2px] p-4 sm:max-w-4xl"
        >
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="font-heading text-xl uppercase">
              Emergency cost request
            </DialogTitle>
            <DialogDescription>
              {data && !mismatch
                ? data.request.requestCode
                : incident.incidentCode}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <ErrorState
              message={error.message}
              onRetry={
                error.retryable ? () => void detail.refetch() : undefined
              }
            />
          ) : mismatch ? (
            <ErrorState message="The request does not belong to this incident. No financial information is shown." />
          ) : data ? (
            <>
              <EmergencyCostActions
                key={`${source}:${scope}:${data.request.emergencyCostRequestId}`}
                request={data.request}
                refreshing={detail.isFetching}
                onReload={() => void detail.refetch()}
                onChanged={onChanged}
                decisionAllowed={incident.availableActions.includes(
                  "DECIDE_COST",
                )}
              />
              <EmergencyCostDetailSections
                request={data.request}
                evidence={data.evidence}
                audience={routeAudience}
                mock={data.source === "mock"}
              />
            </>
          ) : (
            <div role="status" aria-label="Loading request">
              <Skeleton className="h-24 w-full rounded-[2px]" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
