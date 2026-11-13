import { useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { PageHeader } from "@/shared/components/PageHeader";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmergencyCostModeNotice } from "../components/EmergencyCostModeNotice";
import { EmergencyCostForm } from "../components/EmergencyCostForm";
import { useEmergencyCostIncident } from "../hooks/useEmergencyCostIncident";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";
import {
  emergencyCostScopedListPath,
  type EmergencyCostAudience,
} from "../navigation";
import { getEmergencyCostError } from "../services";

export default function EmergencyCostCreatePage({
  audience,
}: {
  audience: EmergencyCostAudience;
}) {
  const [search] = useSearchParams();
  const incidentId = search.get("incidentReportId");
  const query = useEmergencyCostIncident(incidentId);
  const { scope, source } = useEmergencyCostScope();
  const error = query.isError
    ? getEmergencyCostError(query.error, "context")
    : null;
  const incident = query.data;
  return (
    // Same page frame as the web's other screens: a compact header with its back link, then one readable 896px column.
    <main className="mx-auto w-full min-w-0 max-w-4xl space-y-4 p-4 font-sans sm:p-6">
      <div>
        <PageHeader
          title="New emergency cost request"
          size="compact"
          backHref={emergencyCostScopedListPath(
            audience,
            query.validId ? incidentId! : undefined,
          )}
          backLabel="Emergency costs"
        />
        <p className="mt-1 mb-0 text-xs text-slate-500 sm:text-sm">
          Request a review of necessary emergency expenses. This form does not
          approve spending.
        </p>
      </div>
      <EmergencyCostModeNotice />
      {!query.allowed ? (
        <ErrorState message="Only an authorized Driver, Escort or Fleet & Route Coordinator can create a request." />
      ) : !query.validId ? (
        <ErrorState message="Provide a valid incidentReportId UUID in the URL. No context or create request is sent." />
      ) : error && !incident ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : incident ? (
        // One column: the incident sits in the form's own header strip (no raw incident ID is shown).
        <div className="min-w-0 space-y-3">
          {error ? (
            <p role="alert" className="m-0 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error.message}
            </p>
          ) : null}
          <EmergencyCostForm
            key={`${scope}:${source}:${incident.incidentReportId}`}
            audience={audience}
            incident={incident}
            contextUnavailable={
              query.isFetching || query.isError || !query.isEnabled
            }
          />
        </div>
      ) : (
        <div role="status" aria-label="Loading incident context">
          <Skeleton className="h-24 w-full rounded-xs" />
          <Skeleton className="mt-3 h-80 w-full rounded-xs" />
        </div>
      )}
    </main>
  );
}
