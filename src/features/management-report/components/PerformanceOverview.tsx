import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { reportNumber, reportRate, signedNumber } from "../presentation";
import type { OnTimeReport } from "../schemas";

export function PerformanceOverview({ report }: { report: OnTimeReport }) {
  const { kpi } = report;
  const metrics = [
    {
      label: "Measured transports",
      value: reportNumber(kpi.totalTransports.value),
      previous: reportNumber(kpi.totalTransports.previous),
      change: signedNumber(kpi.totalTransports.change),
      tone: "text-slate-500",
      help: "Completed transports with both planned end and an actual arrival. Excluded trips are listed separately.",
    },
    {
      label: "On-time delivery",
      value: reportRate(kpi.onTimeRate.value),
      previous: reportRate(kpi.onTimeRate.previous),
      change: `${signedNumber(kpi.onTimeRate.change)}${kpi.onTimeRate.change === null ? "" : " pp"}`,
      tone:
        kpi.onTimeRate.change === null || kpi.onTimeRate.change === 0
          ? "text-slate-500"
          : kpi.onTimeRate.change > 0
            ? "text-emerald-700"
            : "text-amber-800",
      help: "Backend classification: on time includes arrivals up to 60 minutes after the planned end.",
    },
    {
      label: "Avg delivery deviation",
      value: `${signedNumber(kpi.avgDelayMinutes.value)}${kpi.avgDelayMinutes.value === null ? "" : " min"}`,
      previous: `${signedNumber(kpi.avgDelayMinutes.previous)}${kpi.avgDelayMinutes.previous === null ? "" : " min"}`,
      change: `${signedNumber(kpi.avgDelayMinutes.change)}${kpi.avgDelayMinutes.change === null ? "" : " min"}`,
      tone:
        kpi.avgDelayMinutes.change === null || kpi.avgDelayMinutes.change === 0
          ? "text-slate-500"
          : kpi.avgDelayMinutes.change > 0
            ? "text-amber-800"
            : "text-emerald-700",
      help: "Average signed delivery deviation across all measured transports, including early and on-time arrivals. Negative means early.",
    },
  ];
  return (
    <section aria-label="Performance overview" className="min-w-0">
      <div className="grid min-w-0 grid-cols-1 rounded-[2px] border border-slate-200 bg-white sm:grid-cols-2 min-[1200px]:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 border-slate-200 p-4 not-first:border-t sm:odd:border-r sm:nth-2:border-t-0 min-[1200px]:not-first:border-t-0 min-[1200px]:border-r"
          >
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {metric.label}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`About ${metric.label}`}
                    className="rounded-sm text-slate-400 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Info aria-hidden="true" className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-xs">
                  {metric.help}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-2 mb-2 break-words text-2xl font-semibold tabular-nums text-slate-900">
              {metric.value}
            </p>
            <p className="m-0 text-xs text-slate-500">
              Previous: {metric.previous}
            </p>
            <p className={`mt-1 mb-0 text-xs tabular-nums ${metric.tone}`}>
              Change: {metric.change}
            </p>
          </div>
        ))}
        <div className="min-w-0 border-t border-slate-200 p-4 min-[1200px]:border-t-0">
          <h2 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            SLA performance
          </h2>
          <p
            className={`mt-2 mb-2 text-2xl font-semibold ${kpi.onTimeRate.value === null ? "text-slate-500" : kpi.meetsSla ? "text-emerald-700" : "text-amber-800"}`}
          >
            {kpi.onTimeRate.value === null
              ? "Not measurable"
              : kpi.meetsSla
                ? "Met"
                : "Not met"}
          </p>
          <p className="m-0 text-xs text-slate-500">
            Target: {reportRate(kpi.slaTargetRate)}
          </p>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            Current: {reportRate(kpi.onTimeRate.value)}
          </p>
        </div>
      </div>
      <p className="mt-2 mb-0 text-xs text-slate-500">
        Previous period: {report.period.previousDateFrom} –{" "}
        {report.period.previousDateTo}. Rate changes are percentage points.
      </p>
    </section>
  );
}
