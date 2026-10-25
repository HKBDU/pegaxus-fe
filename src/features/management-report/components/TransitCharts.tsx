import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { reportNumber } from "../presentation";
import type { TransitTimeReport } from "../schemas";
import { ChartPanel, NoChart } from "./ReportChartPanel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./chart/Chart";

const distributionConfig: ChartConfig = {
  count: { label: "Transports", color: "hsl(var(--primary))" },
};
const benchmarkConfig: ChartConfig = {
  estimated: { label: "Estimated days", color: "#64748b" },
  actual: { label: "Actual days", color: "hsl(var(--primary))" },
};
const rangeLabels = {
  "<=-1": "≤ −1 day",
  "(-1,0]": "−1 < days ≤ 0",
  "(0,1]": "0 < days ≤ 1",
  "(1,2]": "1 < days ≤ 2",
  ">2": "> 2 days",
};

export function TransitCharts({ report }: { report: TransitTimeReport }) {
  const distribution = report.distribution.map((item) => ({
    ...item,
    label: rangeLabels[item.range],
  }));
  const benchmark = report.routeBenchmark.map((item) => ({
    pair: `${item.originCountry} → ${item.destinationCountry}`,
    actual: item.avgActualDays,
    estimated: item.avgEstimatedDays,
  }));
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartPanel
        title="Duration deviation"
        note="Actual duration minus estimated duration, in days. Negative values represent shorter journeys."
      >
        {distribution.some((item) => item.count > 0) ? (
          <ChartContainer config={distributionConfig}>
            <BarChart
              accessibilityLayer
              layout="vertical"
              data={distribution}
              margin={{ right: 12 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={100}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatValue={reportNumber} />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                maxBarSize={24}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <NoChart>No measured transports in this period.</NoChart>
        )}
        <details className="mt-2 text-xs text-slate-500">
          <summary className="w-fit cursor-pointer focus-visible:outline-2 focus-visible:outline-primary">
            View bucket counts
          </summary>
          <ul className="mt-2 mb-0 space-y-1 pl-4">
            {distribution.map((item) => (
              <li key={item.range}>
                {item.label}: {reportNumber(item.count)}
              </li>
            ))}
          </ul>
        </details>
      </ChartPanel>
      <ChartPanel
        title="Country-pair benchmark"
        note="Average actual and estimated durations in days, grouped by origin → destination."
      >
        {benchmark.length ? (
          <div className="max-h-96 overflow-y-auto pr-1">
            <ChartContainer
              config={benchmarkConfig}
              style={{ height: Math.max(256, benchmark.length * 60 + 55) }}
            >
              <BarChart
                accessibilityLayer
                layout="vertical"
                data={benchmark}
                margin={{ right: 12 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="pair"
                  width={115}
                  tickFormatter={(value: string) =>
                    value.length > 22 ? `${value.slice(0, 21)}…` : value
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatValue={(value) => `${reportNumber(value)} days`}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="estimated"
                  fill="var(--color-estimated)"
                  maxBarSize={17}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="actual"
                  fill="var(--color-actual)"
                  maxBarSize={17}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <NoChart>No country-pair benchmark data in this period.</NoChart>
        )}
        <p className="mt-2 mb-0 text-xs text-slate-500">
          Complete country names and signed deviations appear in the benchmark
          table below.
        </p>
      </ChartPanel>
    </div>
  );
}
