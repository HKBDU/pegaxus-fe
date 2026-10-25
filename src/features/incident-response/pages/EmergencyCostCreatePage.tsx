import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
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
    <main className="mx-auto w-full min-w-0 max-w-3xl space-y-4 p-4 font-sans sm:p-6">
      <Button variant="ghost" asChild className="min-h-11 rounded-xs">
        <Link
          to={emergencyCostScopedListPath(
            audience,
            query.validId ? incidentId! : undefined,
          )}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Emergency costs
        </Link>
      </Button>
      <EmergencyCostModeNotice />
      <header>
        <h1 className="m-0 font-heading text-3xl uppercase">
          New emergency cost request
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Request a review of necessary emergency expenses. This form does not
          approve spending.
        </p>
      </header>
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
        <>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : null}
          <section
            className="space-y-1 rounded-xs border border-border bg-card p-3 text-sm [overflow-wrap:anywhere]"
            aria-label="Incident context"
          >
            <p className="m-0 font-semibold">
              {incident.incidentCode} · {incident.transport.transportCode}
            </p>
            <p className="m-0 text-muted-foreground">{incident.title}</p>
            <p className="m-0 text-xs text-muted-foreground">
              {incident.status} · {incident.transport.status}
            </p>
            <p className="m-0 text-xs text-muted-foreground">
              Incident ID: {incident.incidentReportId}
            </p>
          </section>
          <EmergencyCostForm
            key={`${scope}:${source}:${incident.incidentReportId}`}
            audience={audience}
            incident={incident}
            contextUnavailable={
              query.isFetching || query.isError || !query.isEnabled
            }
          />
        </>
      ) : (
        <div role="status" aria-label="Loading incident context">
          <Skeleton className="h-24 w-full rounded-xs" />
          <Skeleton className="mt-3 h-80 w-full rounded-xs" />
        </div>
      )}
    </main>
  );
}
