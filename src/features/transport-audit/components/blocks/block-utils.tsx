import { toast } from "sonner";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/common";

export function CopyValue({
  value,
  label = "Copy identifier",
}: {
  value?: string;
  label?: string;
}) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <code className="rounded-[2px] bg-slate-100 px-1.5 py-0.5 font-mono text-xs tracking-tight text-slate-800 border border-slate-200">
        {value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5 text-slate-400 hover:text-slate-700"
        aria-label={label}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          toast.success("Copied identifier to clipboard");
        }}
      >
        <Copy className="size-3" />
      </Button>
    </span>
  );
}

export function StatusPill({
  status,
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  status?: React.ReactNode;
  children?: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral" | "brand";
  dot?: boolean;
  className?: string;
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    brand: "bg-amber-500/10 text-amber-800 border-amber-300",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    brand: "bg-amber-600",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border text-[11px] font-medium tracking-tight whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("size-1.5 rounded-full shrink-0", dotColors[tone])} />
      )}
      {children ?? status}
    </span>
  );
}

export function BlockCard({
  title,
  headerExtra,
  action,
  children,
  empty = false,
  className,
}: {
  title: string;
  headerExtra?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-[2px] border-[#d9d3c7] bg-white py-0 shadow-[0_2px_8px_rgba(23,25,28,0.04)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#ece7dd] bg-[#fcfbf9] px-4 py-2.5">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
          {title}
        </CardTitle>
        {headerExtra ?? action}
      </CardHeader>
      <CardContent className="px-4 py-3.5">
        {empty ? <EmptyState message="No records available." /> : children}
      </CardContent>
    </Card>
  );
}

export function ValueGrid({
  values,
  items,
  columns = 2,
}: {
  values?: Array<[string, React.ReactNode]>;
  items?: Array<{ label: string; value: React.ReactNode }>;
  columns?: 2 | 3 | 4;
}) {
  const colClasses = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  const list =
    items ??
    (values ?? []).map(([label, value]) => ({ label, value }));

  return (
    <dl className={cn("grid gap-2.5", colClasses[columns])}>
      {list.map(({ label, value }) => (
        <div
          key={label}
          className="border-b border-slate-100 pb-1.5 last:border-0 sm:border-0 sm:pb-0"
        >
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </dt>
          <dd className="mt-0.5 break-words text-xs font-medium text-slate-800">
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

