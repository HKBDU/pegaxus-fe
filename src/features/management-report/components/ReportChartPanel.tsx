import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";

export function ChartPanel({
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
export function NoChart({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="m-0 flex min-h-64 items-center justify-center px-4 text-center text-sm text-slate-500"
    >
      {children}
    </p>
  );
}
