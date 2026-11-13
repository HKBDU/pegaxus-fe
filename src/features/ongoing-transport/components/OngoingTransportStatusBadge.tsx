import { CircleCheck, Clock3, Truck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { OngoingTransportStatus } from "../types";

const presentation = {
  READY: {
    label: "Ready",
    icon: Clock3,
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  IN_TRANSIT: {
    label: "In transit",
    icon: Truck,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  COMPLETED: {
    label: "Completed",
    icon: CircleCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
} as const;

export function OngoingTransportStatusBadge({
  status,
  className: extraClassName,
}: {
  status: OngoingTransportStatus;
  className?: string;
}) {
  const { label, icon: Icon, className } = presentation[status];
  return (
    <Badge
      variant="outline"
      className={`rounded-xs px-1.5 py-0.5 text-[10px] font-medium motion-reduce:transition-none ${className} ${extraClassName ?? ""}`}
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
