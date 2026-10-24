import { useLocation } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useIncidentFilterState } from "../filter-state";
import {
  useIncidentClaimReport,
  useIncidentReportExport,
  useReportAccess,
} from "../hooks";
import { reportError, terminalReportError } from "../services";
import { reportTime } from "../presentation";
import { ReportFilters } from "../components/ReportFilters";
import { IncidentOverview } from "../components/IncidentOverview";
import { IncidentCharts } from "../components/IncidentCharts";
import {
  VehicleReliability,
  IncidentDetailsTable,
} from "../components/IncidentTables";
import { ReportExportActions } from "../components/ReportExportActions";

function IncidentWorkspace() {
  const state = useIncidentFilterState();
  const query = useIncidentClaimReport(state.applied);
  const exporting = useIncidentReportExport();
  const location = useLocation();
  const failure = query.error ? reportError(query.error) : null;
  const blocked = [failure, exporting.error].find(
    (error) => error && terminalReportError(error),
  );
  const report = query.data;
  const busy = Boolean(exporting.pending);
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1440px] space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        title="Incident & claim analytics"
        backHref="/admin"
        backLabel="Workspace"
        action={
          <ReportExportActions
            pending={exporting.pending}
            disabled={!state.applied || busy || Boolean(blocked)}
            onExport={(format) => {
              if (state.applied) void exporting.download(state.applied, format);
            }}
          />
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
        <p className="m-0">
          Operational incidents, claims and approved emergency costs.
        </p>
        <p className="m-0">
          Applied period: {String(state.raw.dateFrom)} –{" "}
          {String(state.raw.dateTo)} (UTC)
        </p>
      </div>
      <ReportFilters
        variant="incident-claim-frequency"
        draft={state.draft}
        onChange={state.edit}
        onApply={() => state.apply(() => void query.refetch())}
        onReset={state.reset}
        errors={state.errors}
        disabled={busy}
      />
      {exporting.error && !blocked ? (
        <p
          role="alert"
          className="m-0 border-l-2 border-destructive bg-red-50 px-3 py-2 text-sm text-destructive"
        >
          {exporting.error.message}
        </p>
      ) : null}
      {exporting.completed ? (
        <p role="status" className="m-0 break-words text-xs text-emerald-700">
          {exporting.completed}
        </p>
      ) : null}
      {!state.applied ? (
        <p role="alert" className="m-0 text-sm text-slate-600">
          Correct the report filters above and apply them before loading or
          exporting.
        </p>
      ) : blocked ? (
        <ErrorState message={blocked.message} />
      ) : (
        <>
          {failure ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <span>{failure.message}</span>
              <Button
                type="button"
                variant="outline"
                disabled={query.isFetching || busy}
                onClick={() => void query.refetch()}
              >
                Retry report
              </Button>
            </div>
          ) : null}
          {report ? (
            <>
              <div
                role="status"
                className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs text-slate-500"
              >
                <span>Generated: {reportTime(report.generatedAt)}</span>
                <span>{query.isFetching ? "Updating report…" : ""}</span>
              </div>
              <IncidentOverview report={report} />
              <IncidentCharts report={report} />
              <VehicleReliability report={report} />
              <IncidentDetailsTable
                report={report}
                filters={state.applied}
                returnUrl={location.pathname + location.search}
                onChange={(update) => {
                  if (!busy) state.change(update);
                }}
                pending={query.previousRows}
                error={failure?.message}
                disabled={busy || query.isFetching}
              />
            </>
          ) : query.isPending || query.isFetching ? (
            <div
              role="status"
              aria-label="Loading incident and claim report"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className="h-32" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className="h-80" />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
export default function IncidentClaimReportPage() {
  const { allowed, scope } = useReportAccess();
  if (!allowed)
    return (
      <ErrorState message="Only Logistics Managers can view incident and claim analytics." />
    );
  return <IncidentWorkspace key={scope} />;
}
