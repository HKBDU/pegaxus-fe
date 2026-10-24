import {
  Clock,
  FileCheck2,
  AlertTriangle,
  Truck,
  ShieldCheck,
} from "lucide-react";
import type { AuditTimelineItem } from "../types";
import { formatAuditDateTime } from "../utils";
import { StatusPill } from "./blocks/block-utils";

function getTimelineMeta(type: string) {
  switch (type?.toUpperCase()) {
    case "INCIDENT":
      return {
        icon: AlertTriangle,
        iconColor: "text-rose-600",
        nodeBg: "bg-rose-50 border-rose-300",
        tone: "danger" as const,
      };
    case "HANDOVER":
      return {
        icon: FileCheck2,
        iconColor: "text-emerald-600",
        nodeBg: "bg-emerald-50 border-emerald-300",
        tone: "success" as const,
      };
    case "COMPLIANCE":
    case "DOCUMENT":
      return {
        icon: ShieldCheck,
        iconColor: "text-amber-600",
        nodeBg: "bg-amber-50 border-amber-300",
        tone: "brand" as const,
      };
    case "STATUS":
    default:
      return {
        icon: Truck,
        iconColor: "text-sky-600",
        nodeBg: "bg-sky-50 border-sky-300",
        tone: "info" as const,
      };
  }
}

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

  if (!visible.length) {
    return (
      <div className="py-8 text-center text-xs text-slate-500">
        No chronological audit events recorded for this transport.
      </div>
    );
  }

  return (
    <div className="relative pl-6 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-[2px] before:bg-slate-200">
      <ol aria-label="Audit timeline" className="space-y-3">
        {visible.map((item) => {
          const meta = getTimelineMeta(item.type);
          const Icon = meta.icon;

          return (
            <li key={item.id} className="relative group">
              {/* Timeline marker */}
              <span
                className={`absolute -left-[23px] top-1.5 flex size-5 items-center justify-center rounded-full border shadow-xs ${meta.nodeBg}`}
              >
                <Icon className={`size-3 ${meta.iconColor}`} />
              </span>

              {/* Event card */}
              <div className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-xs transition-colors hover:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusPill tone={meta.tone}>{item.type}</StatusPill>
                    <h4 className="text-xs font-bold text-slate-900">
                      {item.title}
                    </h4>
                    {item.visibility === "INTERNAL" ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-[2px]">
                        Internal
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatAuditDateTime(item.occurredAt)}
                  </span>
                </div>

                {item.description ? (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-1.5">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
