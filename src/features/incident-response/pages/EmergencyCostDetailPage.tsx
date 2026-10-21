import { ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { CostStatusBadge } from "@/shared/components/incident";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmergencyCostDetailSections } from "../components/EmergencyCostDetailSections";
import { EmergencyCostModeNotice } from "../components/EmergencyCostModeNotice";
import { useEmergencyCostDetail } from "../hooks/useEmergencyCostDetail";
import {
  emergencyCostScopedListPath,
  type EmergencyCostAudience,
} from "../navigation";
import { emergencyCostIdSchema } from "../schemas";
import { getEmergencyCostError } from "../services";

export default function EmergencyCostDetailPage({
  audience,
}: {
  audience: EmergencyCostAudience;
}) {
  const { emergencyCostRequestId } = useParams<{
    emergencyCostRequestId: string;
  }>();
  const [search] = useSearchParams();
  const query = useEmergencyCostDetail(emergencyCostRequestId);
  const error = query.isError
    ? getEmergencyCostError(query.error, "detail")
    : null;
  const data = query.isError ? undefined : query.data;
  const requestedScope = search.get("incidentReportId");
  const safeScope = emergencyCostIdSchema.safeParse(requestedScope).success
    ? requestedScope!
    : undefined;
  const mismatch = Boolean(
    data &&
    safeScope &&
    data.request.incident.incidentReportId.toLowerCase() !==
      safeScope.toLowerCase(),
  );
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 p-4 font-sans sm:p-6">
      <Button variant="ghost" asChild className="min-h-11 rounded-xs">
        <Link to={emergencyCostScopedListPath(audience, safeScope)}>
          <ArrowLeft aria-hidden className="size-4" />
          Emergency costs
        </Link>
      </Button>
      <EmergencyCostModeNotice />
      {!query.allowed ? (
        <ErrorState message="You do not have permission to view this emergency cost request." />
      ) : !query.validId ? (
        <ErrorState message="The request ID must be a valid UUID. No detail API request is sent." />
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : mismatch ? (
        <ErrorState message="This request does not match the pinned incident scope. No financial information is shown." />
      ) : data ? (
        <>
          <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <h1 className="m-0 font-heading text-3xl uppercase [overflow-wrap:anywhere]">
                {data.request.requestCode}
              </h1>
              <p className="mt-1 mb-0 text-sm text-muted-foreground">
                Emergency cost request · read-only
              </p>
            </div>
            <CostStatusBadge status={data.request.status} />
          </header>
          <EmergencyCostDetailSections
            request={data.request}
            evidence={data.evidence}
            audience={audience}
            mock={data.source === "mock"}
          />
        </>
      ) : (
        <div
          role="status"
          aria-label="Loading emergency cost details"
          className="space-y-3"
        >
          <Skeleton className="h-20 w-full rounded-xs" />
          <Skeleton className="h-72 w-full rounded-xs" />
        </div>
      )}
    </main>
  );
}
