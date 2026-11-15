import { CheckCircle2, Clock3, Gauge, Info, Truck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { deviationChangeText, deviationText, reportNumber, reportRate, signedNumber } from "../presentation";
import type { OnTimeReport } from "../schemas";

export function PerformanceOverview({ report }: { report: OnTimeReport }) {
  const { kpi } = report;
  // The median is not dragged by a few trips far off the plan; older payloads only carry the average.
  const deviation = kpi.medianDeviationMinutes ?? kpi.avgDelayMinutes;
  const metrics = [
    {
      label: "Measured transports",
      icon: Truck,
      value: reportNumber(kpi.totalTransports.value),
      previous: reportNumber(kpi.totalTransports.previous),
      change: signedNumber(kpi.totalTransports.change),
      tone: "text-slate-500",
      help: "Completed transports with both planned end and an actual arrival. Excluded trips are listed separately.",
    },
    {
      label: "On-time delivery",
      icon: Gauge,
      value: reportRate(kpi.onTimeRate.value),
      previous: reportRate(kpi.onTimeRate.previous),
      change: `${signedNumber(kpi.onTimeRate.change)}${kpi.onTimeRate.change === null ? "" : " pp"}`,
      tone:
        kpi.onTimeRate.change === null || kpi.onTimeRate.change === 0
          ? "text-slate-500"
          : kpi.onTimeRate.change > 0
            ? "text-emerald-700"
            : "text-amber-800",
      help: "On time means arriving within 60 minutes either side of the committed arrival (the end of the confirmed primary route). Arriving earlier counts as early, not on time.",
    },
    {
      label: "Typical delivery deviation",
      icon: Clock3,
      value: deviationText(deviation.value),
      previous: deviationText(deviation.previous),
      change: deviationChangeText(deviation.change),
      tone:
        deviation.change === null || deviation.change === 0
          ? "text-slate-500"
          : deviation.change > 0
            ? "text-amber-800"
            : "text-emerald-700",
      help: "The middle arrival against the committed arrival across measured transports: half arrived earlier than this, half later. A few trips far off the plan do not move it.",
    },
  ];
  return (
    <section aria-label="Performance overview" className="min-w-0">
      <div className="report-kpi-grid">
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
            <p className="report-kpi-value mt-2 mb-2 break-words text-2xl font-semibold tabular-nums text-slate-900">
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
        <div className="report-kpi report-kpi-sla">
          <div className="flex items-center gap-2">
            <span className="report-kpi-icon">
              <CheckCircle2 aria-hidden="true" className="size-4" />
            </span>
            <h2 className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              SLA performance
            </h2>
          </div>
          <p
            className={`report-kpi-value mt-2 mb-2 text-2xl font-semibold ${kpi.onTimeRate.value === null ? "text-slate-500" : kpi.meetsSla ? "text-emerald-700" : "text-amber-800"}`}
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
    </section>
  );
}
