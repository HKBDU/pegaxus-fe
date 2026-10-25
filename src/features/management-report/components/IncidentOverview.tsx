import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/shared/components/ui/tooltip";
import {
  reportNumber,
  reportRate,
  reportMoney,
  signedNumber,
} from "../presentation";
import type { IncidentClaimReport } from "../schemas";

export function IncidentOverview({ report }: { report: IncidentClaimReport }) {
  const { kpi } = report;
  const metrics = [
    {
      label: "Completed transports",
      kpi: kpi.completedTransports,
      format: reportNumber,
      change: signedNumber,
      help: "Transports completed within the reporting period and matching the shared transport filters. This is the rate denominator.",
    },
    {
      label: "Total incidents",
      kpi: kpi.totalIncidents,
      format: reportNumber,
      change: signedNumber,
      help: "Non-cancelled incident events that occurred in the reporting period. Event counts are not the rate numerator.",
    },
    {
      label: "Incident rate",
      kpi: kpi.incidentRate,
      format: reportRate,
      change: (value: number | null) =>
        value === null ? "—" : `${signedNumber(value)} pp`,
      help: "Share of completed transports with at least one eligible live incident. Associated incident dates may fall outside the period.",
    },
    {
      label: "Total claims",
      kpi: kpi.totalClaims,
      format: reportNumber,
      change: signedNumber,
      help: "Non-cancelled claims submitted in the reporting period. Incident-only filters do not narrow the claim query.",
    },
    {
      label: "Claim rate",
      kpi: kpi.claimRate,
      format: reportRate,
      change: (value: number | null) =>
        value === null ? "—" : `${signedNumber(value)} pp`,
      help: "Share of completed transports with at least one eligible claim. This is not total claims divided by completed transports.",
    },
    {
      label: "Approved emergency cost",
      kpi: kpi.totalEmergencyCost,
      format: reportMoney,
      change: (value: number | null) =>
        value === null ? "—" : `${value > 0 ? "+" : ""}${reportMoney(value)}`,
      help: "Approved emergency costs attached to the incident events selected for this period. Rejected costs are excluded by the server.",
    },
  ];
  return (
    <section
      aria-label="Incident and claim overview"
      className="min-w-0 space-y-2"
    >
      <div className="grid min-w-0 grid-cols-1 rounded-[2px] border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`min-w-0 border-slate-200 p-4 ${index > 0 ? "border-t" : ""} ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 2 ? "sm:border-t-0" : ""} ${index % 3 !== 2 ? "xl:border-r" : "xl:border-r-0"} ${index < 3 ? "xl:border-t-0" : ""}`}
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
                    className="shrink-0 rounded-sm text-slate-400 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Info aria-hidden="true" className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72 text-xs">
                  {metric.help}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-2 mb-2 break-words text-2xl font-semibold tabular-nums text-slate-900">
              {metric.format(metric.kpi.value)}
            </p>
            <p className="m-0 text-xs tabular-nums text-slate-500">
              Previous: {metric.format(metric.kpi.previous)}
            </p>
            <p className="mt-1 mb-0 text-xs tabular-nums text-slate-500">
              Change: {metric.change(metric.kpi.change)}
            </p>
          </div>
        ))}
      </div>
      <p className="m-0 text-xs text-slate-500">
        Previous period: {report.period.previousDateFrom} –{" "}
        {report.period.previousDateTo}. Rates use the completed-transport
        cohort; event counts use occurrence/submission dates. A missing
        denominator is shown as —.
      </p>
    </section>
  );
}
