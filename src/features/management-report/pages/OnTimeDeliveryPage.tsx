import { useLocation } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ReportFilters } from "../components/ReportFilters";
import { PerformanceOverview } from "../components/PerformanceOverview";
import { ReportCharts } from "../components/ReportCharts";
import { TransportReportTable } from "../components/TransportReportTable";
import { ReportExportActions } from "../components/ReportExportActions";
import { useOnTimeFilterState } from "../filter-state";
import {
  useOnTimeDeliveryReport,
  useReportAccess,
  useReportExport,
} from "../hooks";
import type { ReportFilters as Filters } from "../schemas";
import { reportError, terminalReportError } from "../services";
import { reportNumber, reportTime } from "../presentation";

function ReportWorkspace() {
  const location = useLocation();
  const state = useOnTimeFilterState();
  const { raw, applied, draft } = state;
  const query = useOnTimeDeliveryReport(applied);
  const exporting = useReportExport();

  function change(update: Partial<Filters>) {
    if (!applied || exporting.pending) return;
    state.change(update);
  }
  function apply() {
    state.apply(() => void query.refetch());
  }
  const failure = query.error ? reportError(query.error) : null;
  const report = query.data;
  const blocked = [failure, exporting.error].find(
    (error) => error && terminalReportError(error),
  );
  const busy = Boolean(exporting.pending);
  const returnUrl = location.pathname + location.search;
  return (
    <main className="mx-auto w-full min-w-0 max-w-[1440px] space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        title="On-time delivery performance"
        backHref="/admin"
        backLabel="Workspace"
        action={
          <ReportExportActions
            pending={exporting.pending}
            disabled={!applied || busy || Boolean(blocked)}
            onExport={(format) => {
              if (applied) void exporting.download(applied, format);
            }}
          />
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
        <p className="m-0">
          Analyze delivery punctuality, trends and SLA performance.
        </p>
        <p className="m-0">
          Applied period: {String(raw.dateFrom)} – {String(raw.dateTo)} (UTC)
        </p>
      </div>
      <ReportFilters
        draft={draft}
        onChange={state.edit}
        onApply={apply}
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
      {!applied ? (
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
                variant="outline"
                type="button"
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
              <PerformanceOverview report={report} />
              <ReportCharts report={report} />
              <section
                aria-labelledby="data-quality-heading"
                className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 rounded-[2px] border border-slate-200 bg-white p-4 text-xs text-slate-500"
              >
                <h2
                  id="data-quality-heading"
                  className="m-0 font-heading text-base uppercase text-slate-900"
                >
                  Data quality
                </h2>
                <span>
                  Excluded:{" "}
                  <strong className="tabular-nums text-slate-800">
                    {reportNumber(report.excluded.count)}
                  </strong>
                </span>
                <span>
                  Missing planned end:{" "}
                  <strong className="tabular-nums text-slate-800">
                    {reportNumber(report.excluded.reasons.MISSING_PLANNED_END)}
                  </strong>
                </span>
                <span>
                  Missing actual arrival:{" "}
                  <strong className="tabular-nums text-slate-800">
                    {reportNumber(
                      report.excluded.reasons.MISSING_ACTUAL_ARRIVAL,
                    )}
                  </strong>
                </span>
              </section>
              <TransportReportTable
                report={report}
                filters={applied}
                onChange={change}
                returnUrl={returnUrl}
                pending={query.previousRows}
                tableError={failure?.message}
                disabled={busy || query.isFetching}
              />
            </>
          ) : query.isPending || query.isFetching ? (
            <div
              role="status"
              aria-label="Loading on-time delivery report"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((index) => (
                  <Skeleton key={index} className="h-32" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[1, 2, 3, 4].map((index) => (
                  <Skeleton key={index} className="h-80" />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

export default function OnTimeDeliveryPage() {
  const { allowed, scope } = useReportAccess();
  if (!allowed)
    return (
      <ErrorState message="Only Logistics Managers can view on-time delivery analytics." />
    );
  return <ReportWorkspace key={scope} />;
}
