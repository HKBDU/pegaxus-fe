import {
  CircleAlert,
  FileText,
  Info,
  Percent,
  Truck,
  Wallet,
} from "lucide-react";
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
      icon: Truck,
      kpi: kpi.completedTransports,
      format: reportNumber,
      change: signedNumber,
      help: "Transports completed within the reporting period and matching the shared transport filters. This is the rate denominator.",
    },
    {
      label: "Total incidents",
      icon: CircleAlert,
      kpi: kpi.totalIncidents,
      format: reportNumber,
      change: signedNumber,
      help: "Non-cancelled incident events that occurred in the reporting period. Event counts are not the rate numerator.",
    },
    {
      label: "Incident rate",
      icon: Percent,
      kpi: kpi.incidentRate,
      format: reportRate,
      change: (value: number | null) =>
        value === null ? "—" : `${signedNumber(value)} pp`,
      help: "Share of completed transports with at least one eligible live incident. Associated incident dates may fall outside the period.",
    },
    {
      label: "Total claims",
      icon: FileText,
      kpi: kpi.totalClaims,
      format: reportNumber,
      change: signedNumber,
      help: "Non-cancelled claims submitted in the reporting period. Incident-only filters do not narrow the claim query.",
    },
    {
      label: "Claim rate",
      icon: Percent,
      kpi: kpi.claimRate,
      format: reportRate,
      change: (value: number | null) =>
        value === null ? "—" : `${signedNumber(value)} pp`,
      help: "Share of completed transports with at least one eligible claim. This is not total claims divided by completed transports.",
    },
    {
      label: "Approved emergency cost",
      icon: Wallet,
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
      <div className="report-kpi-grid report-kpi-grid-six">
        {metrics.map((metric) => (
          <div key={metric.label} className="report-kpi">
            <div className="flex items-center gap-2">
              <span className="report-kpi-icon">
                <metric.icon aria-hidden="true" className="size-4" />
              </span>
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
            <p className="report-kpi-value mt-2 mb-2 break-words text-2xl font-semibold tabular-nums text-slate-900">
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
    </section>
  );
}
