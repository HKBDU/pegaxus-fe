import { Clock, FileCheck, ShieldAlert, Truck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { AuditTimelineItem } from "../types";
import { formatAuditDateTime } from "../utils";
const icons = { INCIDENT: ShieldAlert, HANDOVER: FileCheck, STATUS: Truck };
export function AuditTimeline({
  items,
  publicOnly = false,
}: {
  items: AuditTimelineItem[];
  publicOnly?: boolean;
}) {
  const visible = publicOnly
    ? items.filter((i) => i.visibility !== "INTERNAL")
    : items;
  return (
    <ol aria-label="Audit timeline" className="space-y-4">
      {visible.map((item) => {
        const Icon = icons[item.type as keyof typeof icons] ?? Clock;
        return (
          <li
            key={item.id}
            className="relative flex gap-3 border-l border-slate-200 pl-5"
          >
            <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full border border-[#f39200] bg-white text-[#f39200]">
              <Icon className="size-3.5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{item.title}</p>
                <Badge variant="outline">{item.type}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {formatAuditDateTime(item.occurredAt)}
              </p>
              {item.description ? (
                <p className="mt-1 text-sm text-slate-700">
                  {item.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
