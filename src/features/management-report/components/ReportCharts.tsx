import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import type { ReactNode } from "react";
import type { OnTimeReport } from "../schemas";
import {
  bucketLabels,
  causeLabels,
  reportNumber,
  reportRate,
} from "../presentation";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./chart/Chart";

const series = {
  onTimeRate: { label: "On-time rate", color: "hsl(var(--primary))" },
  count: { label: "Transports", color: "#475569" },
} satisfies ChartConfig;
const distributionConfig = {
  ON_TIME: { label: "On time", color: "#059669" },
  MINOR_DELAY: { label: "Minor delay", color: "hsl(var(--primary))" },
  MAJOR_DELAY: { label: "Major delay", color: "#b91c1c" },
} satisfies ChartConfig;

function ChartPanel({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <Card className="min-w-0 gap-3 rounded-[2px] py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-base uppercase">
          {title}
        </CardTitle>
        {note ? <p className="m-0 text-xs text-slate-500">{note}</p> : null}
      </CardHeader>
      <CardContent className="min-w-0 px-4">{children}</CardContent>
    </Card>
  );
}
function NoChart({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="m-0 flex min-h-64 items-center justify-center px-4 text-center text-sm text-slate-500"
    >
      {children}
    </p>
  );
}

export function ReportCharts({ report }: { report: OnTimeReport }) {
  const distribution = (
    Object.keys(bucketLabels) as (keyof typeof bucketLabels)[]
  ).map((bucket) => ({
    bucket,
    count: report.distribution[bucket],
    fill: `var(--color-${bucket})`,
  }));
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const causes = report.delayCauses.map((item) => ({
    ...item,
    label: causeLabels[item.cause],
  }));
  const trend = report.trend;
  const hasTrend = trend.some((point) => point.onTimeRate !== null);
  const providers = report.byProvider;
  const providerHeight = Math.max(256, providers.length * 42 + 35);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartPanel
        title="Delivery performance trend"
        note="On-time rate across measured completed transports."
      >
        {hasTrend ? (
          <ChartContainer config={series}>
            <LineChart
              accessibilityLayer
              data={trend}
              margin={{ left: 0, right: 15, top: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                width={42}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatValue={reportRate}
                    details={(row) => (
                      <p className="mt-2 mb-0 text-slate-500">
                        {String(row.from)} – {String(row.to)}
                        <br />
                        {typeof row.total === "number"
                          ? reportNumber(row.total)
                          : "—"}{" "}
                        measured transports
                      </p>
                    )}
                  />
                }
              />
              <Line
                dataKey="onTimeRate"
                type="linear"
                stroke="var(--color-onTimeRate)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        ) : (
          <NoChart>
            No measured trips are available for the selected trend.
          </NoChart>
        )}
        <details className="mt-2 text-xs text-slate-500">
          <summary className="w-fit cursor-pointer focus-visible:outline-2 focus-visible:outline-primary">
            View trend values
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            {trend.map((point) => (
              <li key={point.label}>
                {point.label} ({point.from} – {point.to}):{" "}
                {reportRate(point.onTimeRate)} · {reportNumber(point.total)}{" "}
                trips
              </li>
            ))}
          </ul>
        </details>
      </ChartPanel>
      <ChartPanel
        title="Delay distribution"
        note="Classification supplied by the reporting service."
      >
        {total > 0 ? (
          <ChartContainer config={distributionConfig}>
            <PieChart accessibilityLayer>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="bucket"
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
          </ChartContainer>
        ) : (
          <NoChart>No measured transports in this period.</NoChart>
        )}
        <ul className="mt-2 mb-0 grid list-none grid-cols-1 gap-1 p-0 text-xs text-slate-500 sm:grid-cols-3">
          {distribution.map((item) => (
            <li key={item.bucket}>
              {bucketLabels[item.bucket]}: {reportNumber(item.count)}
              {total ? ` · ${reportRate((item.count / total) * 100)}` : ""}
            </li>
          ))}
        </ul>
      </ChartPanel>
      <ChartPanel
        title="Provider performance"
        note="A trip may belong to several providers; group totals overlap."
      >
        {providers.some((provider) => provider.onTimeRate !== null) ? (
          <div className="max-h-96 overflow-y-auto pr-1">
            <ChartContainer
              config={series}
              className="min-h-64"
              style={{ height: providerHeight }}
            >
              <BarChart
                accessibilityLayer
                layout="vertical"
                data={providers}
                margin={{ left: 0, right: 15 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="providerName"
                  width={110}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(name: string) =>
                    name.length > 17 ? `${name.slice(0, 16)}…` : name
                  }
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatValue={reportRate}
                      details={(row) => (
                        <p className="mt-2 mb-0 break-words text-slate-500">
                          {String(row.providerName)} ·{" "}
                          {typeof row.total === "number"
                            ? reportNumber(row.total)
                            : "—"}{" "}
                          trips
                        </p>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="onTimeRate"
                  fill="var(--color-onTimeRate)"
                  maxBarSize={18}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <NoChart>No provider performance data is available.</NoChart>
        )}
        <details className="mt-2 text-xs text-slate-500">
          <summary className="w-fit cursor-pointer focus-visible:outline-2 focus-visible:outline-primary">
            View provider values
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            {providers.map((provider) => (
              <li
                key={`${provider.transportProviderId ?? "internal"}:${provider.providerName}`}
                className="break-words"
              >
                {provider.providerName}: {reportRate(provider.onTimeRate)} ·{" "}
                {reportNumber(provider.total)} trips
              </li>
            ))}
          </ul>
        </details>
      </ChartPanel>
      <ChartPanel
        title="Main delay causes"
        note="Backend-inferred cause for delayed transports, not a recorded diagnosis."
      >
        {causes.some((cause) => cause.count > 0) ? (
          <ChartContainer config={series}>
            <BarChart
              accessibilityLayer
              layout="vertical"
              data={causes}
              margin={{ left: 0, right: 15 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={105}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                maxBarSize={22}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <NoChart>No delayed transports to classify.</NoChart>
        )}
        <ul className="mt-2 mb-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-slate-500">
          {causes.map((cause) => (
            <li key={cause.cause}>
              {cause.label}: {reportNumber(cause.count)}
            </li>
          ))}
        </ul>
      </ChartPanel>
    </div>
  );
}
