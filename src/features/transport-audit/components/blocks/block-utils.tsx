import { toast } from "sonner";
import { Copy } from "lucide-react";
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
      <code className="rounded-[2px] bg-slate-100 px-1.5 py-0.5 font-mono text-xs tracking-tight">
        {value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        aria-label={label}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          toast.success("Copied identifier");
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </span>
  );
}
export function BlockCard({
  title,
  children,
  empty = false,
}: {
  title: string;
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="gap-0 rounded-[2px] border-[#d9d3c7] bg-white py-0 shadow-[0_3px_12px_rgba(23,25,28,0.06)]">
      <CardHeader className="border-b border-[#ece7dd] bg-[#fbfaf7] px-5 py-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {empty ? <EmptyState message="No records available." /> : children}
      </CardContent>
    </Card>
  );
}
export function ValueGrid({
  values,
}: {
  values: Array<[string, React.ReactNode]>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </dt>
          <dd className="break-words text-sm text-slate-800">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
