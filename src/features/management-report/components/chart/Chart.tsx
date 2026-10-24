import {
  createContext,
  useContext,
  useId,
  type CSSProperties,
  type ReactNode,
  type ComponentProps,
} from "react";
import { ResponsiveContainer, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label: string; color: string }>;
const ChartContext = createContext<ChartConfig>({});

export function ChartContainer({
  config,
  children,
  className,
  style,
}: {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>["children"];
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      value.color,
    ]),
  );
  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={id}
        className={cn(
          "h-64 min-h-64 w-full min-w-0 text-xs [&_.recharts-cartesian-axis-tick_text]:fill-slate-500 [&_.recharts-cartesian-grid_line]:stroke-slate-200 [&_.recharts-pie-label-text]:fill-slate-700",
          className,
        )}
        style={{ ...colors, ...style } as CSSProperties}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 320, height: 256 }}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Tooltip;
export const ChartLegend = Legend;

type TooltipEntry = {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: string | number;
  payload?: unknown;
};
export function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
  details,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  formatValue?: (value: number) => string;
  details?: (value: Record<string, unknown>) => ReactNode;
}) {
  const config = useContext(ChartContext);
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-72 rounded-[2px] border border-slate-200 bg-white p-3 text-xs shadow-md">
      {typeof label === "string" || typeof label === "number" ? (
        <p className="m-0 mb-2 break-words font-semibold text-slate-900">
          {label}
        </p>
      ) : null}
      {payload.map((item, index) => {
        const entry = config[String(item.dataKey)] ?? config[String(item.name)];
        return (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0"
                style={{ background: entry?.color ?? item.color }}
              />
              {entry?.label ?? String(item.name ?? "Value")}
            </span>
            <span className="font-medium tabular-nums">
              {typeof item.value === "number"
                ? (formatValue?.(item.value) ?? item.value.toLocaleString())
                : "—"}
            </span>
          </div>
        );
      })}
      {row !== null && typeof row === "object" && !Array.isArray(row)
        ? details?.(row as Record<string, unknown>)
        : null}
    </div>
  );
}

export function ChartLegendContent({
  payload,
}: {
  payload?: readonly {
    value?: unknown;
    color?: string;
    dataKey?: string | number;
  }[];
}) {
  const config = useContext(ChartContext);
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-2 p-0 pt-3 text-xs text-slate-600">
      {payload?.map((entry, index) => {
        const item =
          config[String(entry.value)] ?? config[String(entry.dataKey)];
        return (
          <li key={index} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2"
              style={{ background: item?.color ?? entry.color }}
            />
            {item?.label ?? String(entry.value ?? "")}
          </li>
        );
      })}
    </ul>
  );
}
