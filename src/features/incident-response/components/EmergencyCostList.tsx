import { useId, useState } from "react";
import { canAccess, normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/utils";
import { ErrorState, PageSizeSelect, Pagination } from "@/shared/components/common";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { EMERGENCY_COST_STATUS_OPTIONS } from "@/shared/constants/incident";
import type { IncidentAudience } from "@/shared/types/incident";
import { useEmergencyCostRequests } from "../hooks/useEmergencyCostRequests";
import { emergencyCostStatuses, type EmergencyCostParams } from "../schemas";
import { canReadEmergencyCosts, getEmergencyCostError } from "../services";
import { EmergencyCostFilters, type EmergencyCostFilterPatch } from "./EmergencyCostFilters";
import { EmergencyCostResults } from "./EmergencyCostResults";
import { emergencyCostSource } from "../source";
import { emergencyCostDetailPath, type EmergencyCostAudience } from "../navigation";

export interface EmergencyCostListProps {
  incidentReportId?: string;
  transportId?: string;
  embedded?: boolean;
  audience?: IncidentAudience;
  className?: string;
  routeAudience?: EmergencyCostAudience;
}

export function EmergencyCostList(props: EmergencyCostListProps) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  if (props.audience === "CUSTOMER") return null;
  if (!signedIn || !canReadEmergencyCosts(principal))
    return <ErrorState message="You do not have permission to view emergency cost requests." />;
  if (props.embedded && !props.incidentReportId?.trim())
    return <ErrorState message="An incident is required for this embedded emergency cost list." />;
  return <EmergencyCostListContent {...props}
    key={JSON.stringify([principal!.id, sessionVersion, principal!.roles.map(normalizeRole).sort(), emergencyCostSource(), props.incidentReportId, props.transportId, props.embedded])}
    manager={canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })} />;
}

function EmergencyCostListContent({ incidentReportId, transportId, embedded, className, manager, routeAudience }: EmergencyCostListProps & { manager: boolean }) {
  const headingId = useId();
  const defaults: EmergencyCostParams = {
    status: manager ? "PENDING" : emergencyCostStatuses.join(","),
    pageIndex: 1, pageSize: 20, sortBy: "requestedAt:desc",
  };
  const [params, setParams] = useState<EmergencyCostParams>(defaults);
  const keyword = useDebounce(params.keyword ?? "", 300);
  const searchPending = keyword !== (params.keyword ?? "");
  const query = useEmergencyCostRequests({
    ...params, keyword,
    // These props cannot be overridden or cleared by the general filter toolbar.
    incidentReportId, transportId,
  }, !searchPending);
  const validation = query.validationError;
  const error = query.isError ? getEmergencyCostError(query.error) : null;
  const page = !error && !validation && !searchPending ? query.data : undefined;
  const busy = query.isFetching || searchPending;
  const changeFilters = (patch: EmergencyCostFilterPatch) =>
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }));
  const meta = page ? {
    currentPage: page.pageIndex, itemsPerPage: page.pageSize,
    totalItems: page.totalItems, totalPages: page.totalPages,
    hasPreviousPage: page.pageIndex > 1,
    hasNextPage: page.pageIndex < page.totalPages,
  } : null;
  const first = page && page.items.length > 0 ? (page.pageIndex - 1) * page.pageSize + 1 : 0;
  const last = page && page.items.length > 0 ? Math.min(first + page.items.length - 1, page.totalItems) : 0;
  return (
    <section aria-labelledby={headingId} className={cn("min-w-0 space-y-3 font-sans", className)}>
      <header className="border-b border-border pb-3">
        <h2 id={headingId} className="m-0 font-heading text-xl font-semibold uppercase tracking-wide text-foreground sm:text-2xl">
          {embedded ? "Emergency costs" : "Emergency cost requests"}
        </h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">View and monitor emergency expenses. Read-only; dates use your local timezone.</p>
        {incidentReportId || transportId ? <p className="mt-1 mb-0 text-xs break-all text-muted-foreground">
          {incidentReportId ? `Incident scope: ${incidentReportId}` : null}
          {incidentReportId && transportId ? " · " : null}
          {transportId ? `Transport scope: ${transportId}` : null}
        </p> : null}
      </header>
      {!embedded ? (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Server status totals</p>
          <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {emergencyCostStatuses.map((status) => {
              const count = page?.counts?.[status.toLowerCase() as "pending" | "approved" | "rejected" | "cancelled"];
              return <div key={status} className="flex items-center justify-between gap-2 rounded-xs border border-border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">{EMERGENCY_COST_STATUS_OPTIONS[status].label}</dt>
                <dd className="m-0 text-lg font-semibold tabular-nums">{count == null ? <span aria-label="Count unavailable">—</span> : count.toLocaleString()}</dd>
              </div>;
            })}
          </dl>
        </div>
      ) : null}
      <EmergencyCostFilters params={params}
        dateError={validation?.issues.find((issue) => issue.path[0] === "toDate")?.message}
        onChange={changeFilters} onClear={() => setParams({ ...defaults, pageSize: params.pageSize })} />
      <div role="status" aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {validation ? "Review the filters before loading requests." : error ? "Emergency cost data unavailable" : busy || query.isPending ? "Loading requests..." : page ? `${page.totalItems} matching requests` : ""}
      </div>
      {validation ? (
        <p role="alert" className="rounded-xs border border-destructive/30 p-3 text-sm text-destructive">{validation.issues[0]?.message}</p>
      ) : error && !searchPending ? (
        <div className="[&>div]:rounded-xs [&>div]:p-4"><ErrorState message={error.message} onRetry={error.retryable ? () => void query.refetch() : undefined} /></div>
      ) : (
        <div className="min-w-0 rounded-xs border border-border bg-card">
          <EmergencyCostResults items={page?.items ?? []} loading={!page} busy={busy}
            detailPath={routeAudience ? (item) => emergencyCostDetailPath(routeAudience, item.emergencyCostRequestId, incidentReportId) : undefined} />
        </div>
      )}
      {page && meta ? (
        <fieldset disabled={busy} aria-label="Emergency cost pagination" className="m-0 flex min-w-0 flex-wrap items-center justify-between gap-3 border-0 p-1 text-xs [&_button]:min-h-11 sm:[&_button]:min-h-7">
          <p className="m-0 text-muted-foreground">Showing {first}–{last} of {page.totalItems}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <PageSizeSelect value={page.pageSize} options={[10, 20, 50]} ariaLabel="Emergency cost requests per page"
              onValueChange={(pageSize) => setParams((current) => ({ ...current, pageIndex: 1, pageSize }))} />
            <Pagination meta={meta} onPageChange={(pageIndex) => {
              if (!busy && pageIndex >= 1 && pageIndex <= page.totalPages)
                setParams((current) => ({ ...current, pageIndex }));
            }} />
          </div>
        </fieldset>
      ) : null}
    </section>
  );
}
