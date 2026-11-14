import { MapPin } from "lucide-react";
import type { CrewPlan } from "../../types";

/** Tells the LM how the new route joins the running trip before approving or activating it. */
export function AnchorNote({
  plan,
  routeLabel,
}: {
  plan: CrewPlan;
  routeLabel: "backup" | "return";
}) {
  if (!plan.anchorMode || !plan.startLocation) return null;
  const start = plan.startLocation.locationName;
  const stoppedAt = plan.endedAtLocation?.locationName;
  const text =
    plan.anchorMode === "INCIDENT_LOCATION"
      ? plan.turnsBack
        ? `The running segment stops at the incident${stoppedAt ? ` (${stoppedAt})` : ""} and the convoy turns back to ${start}, where the ${routeLabel} route starts.`
        : `The running segment stops at the incident${stoppedAt ? ` (${stoppedAt})` : ""} and the ${routeLabel} route starts there at once.`
      : plan.anchorMode === "NEXT_STOP"
        ? `The convoy finishes the running segment and goes on to ${start}, where the ${routeLabel} route starts.`
        : plan.turnsBack
          ? `The convoy waits at a stop and drives back to ${start}, where the ${routeLabel} route starts.`
          : `The convoy waits at ${start}; the ${routeLabel} route starts there.`;
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}
