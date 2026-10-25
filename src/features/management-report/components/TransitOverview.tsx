import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/shared/components/ui/tooltip";
import { reportNumber, reportRate, signedNumber } from "../presentation";
import type { TransitTimeReport } from "../schemas";

const days = (value: number | null) =>
  value === null ? "—" : `${reportNumber(value)} days`;
const signedDays = (value: number | null) =>
  value === null ? "—" : `${signedNumber(value)} days`;

export function TransitOverview({ report }: { report: TransitTimeReport }) {
  const metrics = [
    {
      label: "Measured transports",
      metric: report.kpi.totalTransports,
      format: reportNumber,
      change: signedNumber,
      help: "Completed transports with actual departure, actual arrival and an estimate available. Excluded transports are listed separately.",
    },
    {
      label: "Average actual duration",
      metric: report.kpi.avgActualDays,
      format: days,
      change: signedDays,
      help: "Average journey duration from actual departure to actual arrival. This is a duration, not an arrival-date comparison.",
    },
    {
      label: "Average deviation",
      metric: report.kpi.avgDelayDays,
      format: signedDays,
      change: signedDays,
      help: "Actual duration minus estimated duration, in days. Negative means shorter; positive means longer. It does not measure arrival against planned end.",
    },
    {
      label: "Duration ratio",
      metric: report.kpi.accuracyRatio,
      format: reportRate,
      change: (value: number | null) =>
        value === null ? "—" : `${signedNumber(value)} pp`,
      help: "Total actual minutes divided by total estimated minutes × 100. A ratio of 100% means equal total durations; above 100% means longer. This is not an SLA score or an average of trip percentages.",
    },
  ];
  return (
    <section
      aria-label="Transit time performance overview"
      className="min-w-0 space-y-2"
    >
      <div className="grid min-w-0 grid-cols-1 rounded-[2px] border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <div
            key={item.label}
            className={`min-w-0 border-slate-200 p-4 ${index > 0 ? "border-t" : ""} ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 2 ? "sm:border-t-0" : ""} ${index < 3 ? "xl:border-r" : "xl:border-r-0"} xl:border-t-0`}
          >
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`About ${item.label}`}
                    className="shrink-0 rounded-sm text-slate-400 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Info aria-hidden="true" className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72 text-xs">
                  {item.help}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-2 mb-2 break-words text-2xl font-semibold tabular-nums text-slate-900">
              {item.format(item.metric.value)}
            </p>
            <p className="m-0 text-xs tabular-nums text-slate-500">
              Previous: {item.format(item.metric.previous)}
            </p>
            <p className="mt-1 mb-0 text-xs tabular-nums text-slate-500">
              Change: {item.change(item.metric.change)}
            </p>
          </div>
        ))}
      </div>
      <p className="m-0 text-xs text-slate-500">
        Previous period: {report.period.previousDateFrom} –{" "}
        {report.period.previousDateTo}. Overview and charts cover all measured
        transports, regardless of the detail-table filter.
      </p>
    </section>
  );
}
