import {
  ArrowLeftRight,
  CarFront,
  FileText,
  HeartPulse,
  Navigation,
  Truck,
} from "lucide-react";
import { Link, type To } from "react-router-dom";

import { cn } from "@/lib/utils";
import { driverLocationSharingPath } from "@/features/location-sharing/navigation";
import { incidentPaths } from "@/shared/constants/incident";

import { CREW_ACTION_LABELS, HORSE_HEALTH_ROUTES } from "../constants";
import type { AssignedTransport } from "../types";

function ActionButton({
  icon: Icon,
  label,
  to,
  state,
  disabled,
  disabledReason,
  tone = "neutral",
}: {
  icon: typeof FileText;
  label: string;
  to?: To;
  state?: unknown;
  disabled?: boolean;
  disabledReason?: string;
  tone?: "accent" | "neutral" | "danger";
}) {
  const className = cn(
    "flex aspect-square min-h-0 min-w-0 flex-col items-center justify-center gap-3 rounded-[2px] border p-3 text-center text-sm font-semibold shadow-sm transition-colors lg:aspect-auto lg:min-h-28",
    tone === "accent" &&
      "border-orange-600 bg-orange-600 text-white hover:bg-orange-700",
    tone === "danger" &&
      "border-red-100 bg-white text-slate-800 hover:border-red-300",
    tone === "neutral" &&
      "border-slate-200 bg-white text-slate-800 hover:border-orange-300",
    disabled && "cursor-not-allowed opacity-60 hover:border-slate-200",
  );
  const content = (
    <>
      <Icon className="size-8 shrink-0 text-[#f39200]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block leading-tight">{label}</span>
        {disabled && (
          <span className="mt-1 block text-xs font-normal opacity-70">
            {disabledReason ?? "Unavailable"}
          </span>
        )}
      </span>
    </>
  );
  if (disabled || !to)
    return (
      <button type="button" disabled className={className}>
        {content}
      </button>
    );
  return (
    <Link to={to} state={state} className={className}>
      {content}
    </Link>
  );
}

export function CrewHomeActions({
  transport,
}: {
  transport: AssignedTransport;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ActionButton
          icon={CarFront}
          label="Report Transport Incident"
          to={incidentPaths.newVehicle()}
          state={{ transportId: transport.transportId, from: "/crew" }}
          disabled={transport.status !== "IN_TRANSIT"}
          disabledReason="Available after departure"
          tone="danger"
        />
        <ActionButton
          icon={Truck}
          label={CREW_ACTION_LABELS.viewTransport}
          to={HORSE_HEALTH_ROUTES.transportDetail(transport.transportId)}
          state={{ from: "/crew" }}
        />
        <ActionButton
          icon={HeartPulse}
          label="Report Horse Incident"
          to={incidentPaths.newHorseHealth()}
          state={{ transportId: transport.transportId, from: "/crew" }}
          disabled={transport.status !== "IN_TRANSIT"}
          disabledReason="Available after departure"
          tone="danger"
        />
        <ActionButton
          icon={ArrowLeftRight}
          label={CREW_ACTION_LABELS.handover}
          to={HORSE_HEALTH_ROUTES.handovers(transport.transportId)}
          state={{ from: "/crew" }}
        />
        {transport.myRole === "DRIVER" && (
          <ActionButton
            icon={Navigation}
            label="Share Journey Location"
            to={driverLocationSharingPath(transport.transportId)}
          />
        )}
      </div>
    </>
  );
}
