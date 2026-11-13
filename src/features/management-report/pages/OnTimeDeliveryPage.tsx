import "@/shared/components/report-dashboard.css";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useViewportEntry } from "@/shared/hooks/useViewportEntry";
import { ReportTabs } from "../components/ReportTabs";
import { ReportFilters } from "../components/ReportFilters";
import { PerformanceOverview } from "../components/PerformanceOverview";
import { ReportCharts } from "../components/ReportCharts";
import { TransportReportTable } from "../components/TransportReportTable";
import { ReportExportActions } from "../components/ReportExportActions";
import { ReportModeNotice } from "../components/ReportModeNotice";
import { useOnTimeFilterState } from "../filter-state";
import {
  useOnTimeDeliveryReport,
  useReportAccess,
  useReportExport,
} from "../hooks";
import type { ReportFilters as Filters } from "../schemas";
import { reportError, terminalReportError } from "../services";
import { reportNumber } from "../presentation";

function ReportWorkspace() {
  const location = useLocation();
  const state = useOnTimeFilterState();
  const { applied, draft } = state;
  const reportRef = useRef<HTMLDivElement>(null);
  const hasEnteredViewport = useViewportEntry(reportRef, {
    enabled: applied !== null,
  });
  const query = useOnTimeDeliveryReport(applied, hasEnteredViewport);
  const exporting = useReportExport();

  function change(update: Partial<Filters>) {
    if (!applied || exporting.pending) return;
    state.change(update);
  }
  function apply() {
    state.apply(() => {
      if (hasEnteredViewport) void query.refetch();
    });
  }
  const failure = query.error ? reportError(query.error) : null;
  const report = hasEnteredViewport ? query.data : undefined;
  const blocked = [failure, exporting.error].find(
    (error) => error && terminalReportError(error),
  );
  const busy = Boolean(exporting.pending);
  const returnUrl = location.pathname + location.search;
  return (
    <main className="report-dashboard mx-auto w-full min-w-0 max-w-[1440px] space-y-3 px-3 py-4 sm:px-4">
      <PageHeader
        title="Dashboard"
        showBack={false}
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
      <ReportTabs>
        <ReportModeNotice />
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
        <div ref={reportRef} className="min-h-px space-y-3">
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
                    onClick={() => {
                      if (hasEnteredViewport) void query.refetch();
                    }}
                  >
                    Retry report
                  </Button>
                </div>
              ) : null}
              {report ? (
                <>
                  <p role="status" className="sr-only">
                    {query.isFetching ? "Updating report…" : ""}
                  </p>
                  <PerformanceOverview report={report} />
                  <ReportCharts report={report} />
                  <section
                    aria-labelledby="data-quality-heading"
                    className="report-surface flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs text-slate-500"
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
                        {reportNumber(
                          report.excluded.reasons.MISSING_PLANNED_END,
                        )}
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
              ) : !hasEnteredViewport || query.isPending || query.isFetching ? (
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
        </div>
      </ReportTabs>
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
