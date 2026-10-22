import { useId, useState } from "react";
import { canAccess, normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/utils";
import { ErrorState, TablePagination } from "@/shared/components/common";
import { CostStatusBadge } from "@/shared/components/incident";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { EMERGENCY_COST_STATUS_OPTIONS } from "@/shared/constants/incident";
import type { IncidentAudience } from "@/shared/types/incident";
import { useEmergencyCostRequests } from "../hooks/useEmergencyCostRequests";
import {
  emergencyCostStatuses,
  type EmergencyCostParams,
  type EmergencyCostListItem,
} from "../schemas";
import { canReadEmergencyCosts, getEmergencyCostError } from "../services";
import {
  EmergencyCostFilters,
  type EmergencyCostFilterPatch,
} from "./EmergencyCostFilters";
import { EmergencyCostResults } from "./EmergencyCostResults";
import { emergencyCostSource } from "../source";
import {
  emergencyCostDetailPath,
  type EmergencyCostAudience,
} from "../navigation";

const summaryAccent = {
  warning: "border-l-amber-600 dark:border-l-amber-400",
  success: "border-l-emerald-600 dark:border-l-emerald-400",
  danger: "border-l-red-600 dark:border-l-red-400",
  neutral: "border-l-slate-600 dark:border-l-slate-400",
  info: "border-l-sky-600 dark:border-l-sky-400",
};

export interface EmergencyCostListProps {
  incidentReportId?: string;
  transportId?: string;
  embedded?: boolean;
  audience?: IncidentAudience;
  className?: string;
  routeAudience?: EmergencyCostAudience;
  hideHeading?: boolean;
  onOpenRequest?: (item: EmergencyCostListItem) => void;
}

export function EmergencyCostList(props: EmergencyCostListProps) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  if (props.audience === "CUSTOMER") return null;
  if (!signedIn || !canReadEmergencyCosts(principal))
    return (
      <ErrorState message="You do not have permission to view emergency cost requests." />
    );
  if (props.embedded && !props.incidentReportId?.trim())
    return (
      <ErrorState message="An incident is required for this embedded emergency cost list." />
    );
  return (
    <EmergencyCostListContent
      {...props}
      key={JSON.stringify([
        principal!.id,
        sessionVersion,
        principal!.roles.map(normalizeRole).sort(),
        emergencyCostSource(),
        props.incidentReportId,
        props.transportId,
        props.embedded,
      ])}
      manager={canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })}
    />
  );
}

function EmergencyCostListContent({
  incidentReportId,
  transportId,
  embedded,
  className,
  manager,
  routeAudience,
  hideHeading,
  onOpenRequest,
}: EmergencyCostListProps & { manager: boolean }) {
  const headingId = useId();
  const defaults: EmergencyCostParams = {
    status: manager && !embedded ? "PENDING" : emergencyCostStatuses.join(","),
    pageIndex: 1,
    pageSize: 20,
    sortBy: "requestedAt:desc",
  };
  const [params, setParams] = useState<EmergencyCostParams>(defaults);
  const keyword = useDebounce(params.keyword ?? "", 300);
  const searchPending = keyword !== (params.keyword ?? "");
  const query = useEmergencyCostRequests(
    {
      ...params,
      keyword,
      // These props cannot be overridden or cleared by the general filter toolbar.
      incidentReportId,
      transportId,
    },
    !searchPending,
  );
  const validation = query.validationError;
  const error = query.isError ? getEmergencyCostError(query.error) : null;
  const page = !error && !validation && !searchPending ? query.data : undefined;
  const busy = query.isFetching || searchPending;
  const changeFilters = (patch: EmergencyCostFilterPatch) =>
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }));
  const meta = page
    ? {
        currentPage: page.pageIndex,
        itemsPerPage: page.pageSize,
        totalItems: page.totalItems,
        totalPages: page.totalPages,
        hasPreviousPage: page.pageIndex > 1,
        hasNextPage: page.pageIndex < page.totalPages,
      }
    : null;
  return (
    <section
      aria-labelledby={headingId}
      className={cn("w-full min-w-0 max-w-full space-y-3 font-sans", className)}
    >
      {!hideHeading && (
        <header className="border-b border-border pb-3">
          <h2
            id={headingId}
            className="m-0 font-heading text-xl font-semibold uppercase tracking-wide text-foreground sm:text-2xl"
          >
            {embedded ? "Emergency costs" : "Emergency cost requests"}
          </h2>
          <p className="mt-1 mb-0 text-sm text-muted-foreground">
            View and monitor emergency expenses. Dates use your local timezone.
          </p>
          {incidentReportId || transportId ? (
            <p className="mt-1 mb-0 text-xs break-all text-muted-foreground">
              {incidentReportId ? `Incident scope: ${incidentReportId}` : null}
              {incidentReportId && transportId ? " · " : null}
              {transportId ? `Transport scope: ${transportId}` : null}
            </p>
          ) : null}
        </header>
      )}
      {!embedded ? (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            Server status totals
          </p>
          <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {emergencyCostStatuses.map((status) => {
              const count =
                page?.counts?.[
                  status.toLowerCase() as
                    "pending" | "approved" | "rejected" | "cancelled"
                ];
              return (
                <div
                  key={status}
                  className={cn(
                    "flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[2px] border border-l-4 border-border bg-card px-3 py-3 text-card-foreground shadow-xs",
                    summaryAccent[EMERGENCY_COST_STATUS_OPTIONS[status].tone],
                  )}
                >
                  <dt className="text-xs font-semibold">
                    <CostStatusBadge status={status} />
                  </dt>
                  <dd className="m-0 text-2xl font-semibold tabular-nums text-foreground">
                    {count == null ? (
                      <span aria-label="Count unavailable">—</span>
                    ) : (
                      count.toLocaleString()
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}
      <EmergencyCostFilters
        params={params}
        dateError={
          validation?.issues.find((issue) => issue.path[0] === "toDate")
            ?.message
        }
        onChange={changeFilters}
      />
      <div
        role="status"
        aria-live="polite"
        className="min-h-5 text-xs text-muted-foreground"
      >
        {validation
          ? "Review the filters before loading requests."
          : error
            ? "Emergency cost data unavailable"
            : busy || query.isPending
              ? "Loading requests..."
              : page
                ? `${page.totalItems} matching requests`
                : ""}
      </div>
      {validation ? (
        <p
          role="alert"
          className="rounded-xs border border-destructive/30 p-3 text-sm text-destructive"
        >
          {validation.issues[0]?.message}
        </p>
      ) : error && !searchPending ? (
        <div className="[&>div]:rounded-xs [&>div]:p-4">
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        </div>
      ) : (
        <div className="min-w-0 rounded-xs border border-border bg-card">
          <EmergencyCostResults
            items={page?.items ?? []}
            loading={!page}
            busy={busy}
            onOpen={onOpenRequest}
            detailPath={
              routeAudience
                ? (item) =>
                    emergencyCostDetailPath(
                      routeAudience,
                      item.emergencyCostRequestId,
                      incidentReportId,
                    )
                : undefined
            }
          />
        </div>
      )}
      {page && meta ? (
        <fieldset
          disabled={busy}
          aria-label="Emergency cost pagination"
          className="m-0 min-w-0 border-0 p-1 [&_button]:min-h-11 sm:[&_button]:min-h-7"
        >
          <TablePagination
            meta={meta}
            pageSizeAriaLabel="Emergency cost requests per page"
            onPageSizeChange={(pageSize) => {
              if (!busy)
                setParams((current) => ({
                  ...current,
                  pageIndex: 1,
                  pageSize,
                }));
            }}
            onPageChange={(pageIndex) => {
              if (!busy && pageIndex >= 1 && pageIndex <= page.totalPages)
                setParams((current) => ({ ...current, pageIndex }));
            }}
          />
        </fieldset>
      ) : null}
    </section>
  );
}
