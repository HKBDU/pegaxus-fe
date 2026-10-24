import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Rectangle,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import type { IncidentClaimReport } from "../schemas";
import {
  reportLabel,
  reportMoney,
  reportNumber,
  reportRate,
} from "../presentation";
import { ChartPanel, NoChart } from "./ReportChartPanel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./chart/Chart";

type Breakdown = { key: string; label: string; value: number; color: string };
const orange = "hsl(var(--primary))";
const categories = {
  VEHICLE: "#475569",
  HORSE_HEALTH: "#059669",
  BOTH: orange,
  ROUTE_CHANGE: "#78716c",
};
const severities = {
  LOW: "#64748b",
  MEDIUM: orange,
  HIGH: "#b45309",
  CRITICAL: "#b91c1c",
};
const statuses = {
  PENDING: orange,
  APPROVED: "#059669",
  REJECTED: "#b91c1c",
  RESOLVED: "#475569",
  CANCELLED: "#94a3b8",
};
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function BreakdownChart({
  title,
  data,
  note,
  donut = false,
  money = false,
}: {
  title: string;
  data: Breakdown[];
  note?: string;
  donut?: boolean;
  money?: boolean;
}) {
  const total = donut ? data.reduce((sum, item) => sum + item.value, 0) : 0;
  const config: ChartConfig = {
    ...Object.fromEntries(
      data.map((item) => [item.key, { label: item.label, color: item.color }]),
    ),
    ...(!donut
      ? { value: { label: money ? "Approved cost" : "Count", color: orange } }
      : {}),
  };
  const rows = data.map((item) => ({ ...item, fill: item.color }));
  const format = money ? reportMoney : reportNumber;
  const height = donut ? 256 : Math.max(256, rows.length * 38 + 35);
  return (
    <ChartPanel title={title} note={note}>
      {data.some((item) => item.value !== 0) ? (
        <div className="max-h-96 overflow-y-auto pr-1">
          <ChartContainer config={config} style={{ height }}>
            {donut ? (
              <PieChart accessibilityLayer>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                  isAnimationActive={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatValue={(value) =>
                        `${reportNumber(value)} (${reportRate((value / total) * 100)})`
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            ) : (
              <BarChart
                accessibilityLayer
                layout="vertical"
                data={rows}
                margin={{ left: 0, right: 15 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={money ? ["auto", "auto"] : [0, "auto"]}
                  tickFormatter={
                    money ? (value: number) => compact.format(value) : undefined
                  }
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tickFormatter={(label: string) =>
                    label.length > 18 ? `${label.slice(0, 17)}…` : label
                  }
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatValue={format} />}
                />
                <Bar
                  dataKey="value"
                  fill={orange}
                  maxBarSize={22}
                  isAnimationActive={false}
                  shape={(props: BarShapeProps) => (
                    <Rectangle
                      {...props}
                      fill={
                        typeof props.payload?.fill === "string"
                          ? props.payload.fill
                          : orange
                      }
                    />
                  )}
                />
              </BarChart>
            )}
          </ChartContainer>
        </div>
      ) : (
        <NoChart>No matching data for this breakdown.</NoChart>
      )}
      <details className="mt-2 text-xs text-slate-500">
        <summary className="w-fit cursor-pointer focus-visible:outline-2 focus-visible:outline-primary">
          View complete values
        </summary>
        {data.length ? (
          <ul className="mt-2 mb-0 space-y-1 pl-4">
            {data.map((item) => (
              <li key={item.key} className="break-words">
                {item.label}: {format(item.value)}
                {donut && total > 0
                  ? ` · ${reportRate((item.value / total) * 100)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 mb-0">No breakdown values returned.</p>
        )}
      </details>
    </ChartPanel>
  );
}

export function IncidentCharts({ report }: { report: IncidentClaimReport }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <BreakdownChart
        title="Incident categories"
        donut
        data={report.incidentsByCategory.map((item) => ({
          key: item.category,
          label: reportLabel(item.category),
          value: item.count,
          color: categories[item.category],
        }))}
        note="BOTH is one distinct category; it is not added again to Vehicle or Horse health."
      />
      <BreakdownChart
        title="Incident severity"
        data={(
          Object.keys(report.incidentsBySeverity) as (keyof typeof severities)[]
        ).map((key) => ({
          key,
          label: reportLabel(key),
          value: report.incidentsBySeverity[key],
          color: severities[key],
        }))}
      />
      <BreakdownChart
        title="Incident types"
        data={report.incidentsByType.map((item) => ({
          key: item.incidentType,
          label: reportLabel(item.incidentType),
          value: item.count,
          color: "#475569",
        }))}
        note="An incident may contribute distinct vehicle and horse types."
      />
      <BreakdownChart
        title="Claim types"
        data={report.claimsByType.map((item) => ({
          key: item.claimType,
          label: reportLabel(item.claimType),
          value: item.count,
          color: orange,
        }))}
      />
      <BreakdownChart
        title="Claim statuses"
        donut
        data={(
          Object.keys(report.claimsByStatus) as (keyof typeof statuses)[]
        ).map((key) => ({
          key,
          label: reportLabel(key),
          value: report.claimsByStatus[key],
          color: statuses[key],
        }))}
        note="Cancelled claims are excluded from the reporting query."
      />
      <BreakdownChart
        title="Approved emergency cost by category"
        money
        data={report.emergencyCostByCategory.map((item) => ({
          key: item.category,
          label: reportLabel(item.category),
          value: item.amount,
          color: orange,
        }))}
        note="VND; compact axis labels, full amounts in tooltips and values below."
      />
    </div>
  );
}
