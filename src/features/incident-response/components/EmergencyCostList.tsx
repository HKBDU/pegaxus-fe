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
        <header className="border-b border-[#eceae3] pb-2.5">
          <h2
            id={headingId}
            className="m-0! font-sans! text-sm! leading-5! font-semibold! tracking-normal! text-slate-800!"
          >
            {embedded ? "Emergency costs" : "Emergency cost requests"}
          </h2>
          <p className="mt-0.5 mb-0 text-xs text-slate-500">
            View and monitor emergency expenses. Dates use your local timezone.
          </p>
        </header>
      )}
      {!embedded ? (
        <div>
          <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Requests by status">
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
                    "flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[2px] border border-l-4 border-[#e5e2d9] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgb(23_25_28/0.035)]",
                    summaryAccent[EMERGENCY_COST_STATUS_OPTIONS[status].tone],
                  )}
                >
                  <dt className="text-xs font-semibold">
                    <CostStatusBadge status={status} />
                  </dt>
                  <dd className="m-0 text-xl font-semibold tabular-nums text-slate-900">
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
      <div className="min-w-0 overflow-hidden rounded-xs border border-[#e5e2d9] bg-white shadow-[0_1px_2px_rgb(23_25_28/0.035),0_5px_18px_rgb(63_49_27/0.025)]">
      <div className="p-3">
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
        className="mt-2 min-h-4 px-1 text-[11px] text-slate-500"
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
      </div>
      {validation ? (
        <p
          role="alert"
          className="mx-3 mb-3 rounded-xs border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {validation.issues[0]?.message}
        </p>
      ) : error && !searchPending ? (
        <div className="border-t border-[#eceae3] [&>div]:rounded-none [&>div]:p-4">
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        </div>
      ) : (
        <div className="min-w-0 border-t border-[#eceae3]">
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
          className="m-0 min-w-0 border-0 border-t border-solid border-[#eceae3] px-3 py-2 [&_button]:min-h-11 sm:[&_button]:min-h-7"
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
      </div>
    </section>
  );
}
