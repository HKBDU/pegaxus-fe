import { ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState } from "@/shared/components/common";
import { CostStatusBadge, VndText } from "@/shared/components/incident";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
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
import { EmergencyCostActions } from "../components/EmergencyCostActions";
import { useEmergencyCostScope } from "../hooks/useEmergencyCostScope";

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
  const { scope, source } = useEmergencyCostScope();
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
        // Desktop: the sections, and a sticky side column with the summary (code, status, amounts) and the actions.
        // Phones: the same summary on top. It replaces a phone-style stack (big title, floating buttons, amounts block).
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <aside className="min-w-0 lg:sticky lg:top-16 lg:order-2">
            <section
              aria-label="Emergency cost summary"
              className="rounded-xs border border-[#e5e2d9] bg-white p-4 shadow-[0_1px_2px_rgb(23_25_28/0.035),0_5px_18px_rgb(63_49_27/0.025)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                    Emergency cost request
                  </p>
                  <h1 className="m-0! mt-0.5 font-heading text-lg! leading-6! font-semibold! tracking-normal! text-slate-900! [overflow-wrap:anywhere]">
                    {data.request.requestCode}
                  </h1>
                </div>
                <CostStatusBadge status={data.request.status} />
              </div>
              <p className="m-0 mt-1.5 text-xs text-slate-600">
                {EMERGENCY_COST_CATEGORY_LABELS[data.request.category]} · {data.request.incident.incidentCode}
              </p>
              <dl className="m-0 mt-3 grid grid-cols-2 gap-3 border-t border-[#eceae3] pt-3">
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500">Requested</dt>
                  <dd className="m-0 mt-0.5 text-base font-semibold tabular-nums text-slate-900 [overflow-wrap:anywhere]">
                    <VndText amount={data.request.requestedAmount} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500">Approved</dt>
                  <dd className="m-0 mt-0.5 text-base font-semibold tabular-nums text-slate-900 [overflow-wrap:anywhere]">
                    {data.request.approvedAmount == null ? (
                      <span className="text-sm font-normal text-slate-400">Not yet</span>
                    ) : (
                      <VndText amount={data.request.approvedAmount} />
                    )}
                  </dd>
                </div>
              </dl>
              {/* The actions always render their section; hide the divider block when it holds no button and no error. */}
              <div className="mt-3 border-t border-[#eceae3] pt-3 [&:not(:has(button,[role=alert]))]:hidden">
                <EmergencyCostActions
                  key={`${scope}:${source}:${data.request.emergencyCostRequestId}`}
                  request={data.request}
                  refreshing={query.isFetching}
                  onReload={() => void query.refetch()}
                  stacked
                />
              </div>
            </section>
          </aside>
          <div className="min-w-0 space-y-4 lg:order-1">
            <EmergencyCostDetailSections
              request={data.request}
              evidence={data.evidence}
              audience={audience}
              mock={data.source === "mock"}
              showAmounts={false}
            />
          </div>
        </div>
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
