import { StatusBadge } from "@/shared/components/ui/status-badge";
import type { StatusBadgeTone } from "@/shared/components/ui/status-badge-tones";

const TRANSPORT_STATUS_BADGES: Record<string, { label: string; tone: StatusBadgeTone }> = {
  COMPLETED: { label: "Completed", tone: "emerald" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

/** A status the badge does not know yet is still shown, as readable text in the neutral colour. */
function readable(status: string) {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TransportStatusBadge({ status, className }: { status: string; className?: string }) {
  const known = TRANSPORT_STATUS_BADGES[status];
  return (
    <StatusBadge tone={known?.tone ?? "slate"} className={className}>
      {known?.label ?? readable(status)}
    </StatusBadge>
  );
}
