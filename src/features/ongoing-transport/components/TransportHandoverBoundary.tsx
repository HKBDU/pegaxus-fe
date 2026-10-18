import { useState } from "react";
import { ClipboardCheck, MapPin } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatTransportLabel } from "../format";
import type { HandoverBoundary, TransportAudience } from "../types";

const supportedTypes = [
  "PICKUP",
  "TRANSFER",
  "BORDER_HANDOVER",
  "CARRIER_HANDOVER",
  "DELIVERY",
  "OTHER",
];
const operatorRoles = [
  "LOGISTICS_MANAGER",
  "FLEET_ROUTE_COORDINATOR",
  "DRIVER",
  "ESCORT",
];

export function TransportHandoverBoundary({
  boundary,
  audience,
  position,
}: {
  boundary: HandoverBoundary;
  audience: TransportAudience;
  position: "pickup" | "transfer" | "delivery" | "unmatched";
}) {
  const roles = useAuthStore((state) => state.principal?.roles);
  const [selection, setSelection] = useState("");
  const availableTypes = boundary.allowedHandoverTypes.filter((value) =>
    supportedTypes.includes(value),
  );
  const selected = availableTypes.includes(selection)
    ? selection
    : availableTypes.length === 1
      ? availableTypes[0]
      : "";
  const canCreate =
    audience !== "customer" &&
    roles?.some((role) => operatorRoles.includes(role)) &&
    boundary.canCreate &&
    !boundary.existingHandover &&
    availableTypes.length > 0;
  const record = boundary.existingHandover;
  const label =
    position === "pickup"
      ? "Pickup boundary"
      : position === "delivery"
        ? "Delivery boundary"
        : position === "transfer"
          ? "Transfer boundary"
          : "Handover boundary";
  return (
    <section
      aria-label={`${label} ${boundary.boundaryNo}`}
      className="route-boundary"
    >
      <div className="route-timeline-marker bg-white text-slate-500">
        <MapPin aria-hidden="true" className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="m-0 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            {label} · {boundary.boundaryNo}
          </p>
          <h3 className="m-0 text-sm font-semibold break-words text-slate-800">
            {boundary.location.locationName}
          </h3>
          <p className="m-0 text-xs break-words text-slate-500">
            {[boundary.location.address, boundary.location.country]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {position === "unmatched" ? (
            <p className="m-0 text-xs text-amber-800">
              The server returned this boundary without a matching adjacent leg
              pair.
            </p>
          ) : null}
          {record ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ClipboardCheck
                aria-hidden="true"
                className="size-3.5 text-slate-500"
              />
              <span className="text-xs font-medium text-slate-700">
                {record.handoverCode}
              </span>
              <Badge variant="secondary" className="rounded-xs text-[10px]">
                {formatTransportLabel(record.handoverType)}
              </Badge>
              <Badge variant="outline" className="rounded-xs text-[10px]">
                {formatTransportLabel(record.status)}
              </Badge>
            </div>
          ) : boundary.allowedHandoverTypes.length > 0 ? (
            <p className="m-0 pt-1 text-xs text-slate-500">
              Allowed:{" "}
              {boundary.allowedHandoverTypes
                .map(formatTransportLabel)
                .join(" / ")}
            </p>
          ) : (
            <p className="m-0 pt-1 text-xs text-slate-500">
              No handover action available at this boundary.
            </p>
          )}
        </div>
        {record ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            className="rounded-xs text-xs"
            aria-label={`View handover ${record.handoverCode} — route integration pending`}
          >
            View Handover Record
          </Button>
        ) : canCreate ? (
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {availableTypes.length > 1 ? (
              <Select value={selected} onValueChange={setSelection}>
                <SelectTrigger
                  aria-label={`Handover type at boundary ${boundary.boundaryNo}`}
                  className="w-48 max-w-full rounded-xs bg-white text-xs"
                >
                  <SelectValue placeholder="Select handover type" />
                </SelectTrigger>
                <SelectContent
                  className={
                    audience === "crew"
                      ? "animate-none [&_[role=option]]:min-h-[60px] [&_[role=option]]:text-base"
                      : "motion-reduce:animate-none"
                  }
                >
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatTransportLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              className="rounded-xs text-xs"
            >
              Create Handover Record
            </Button>
          </div>
        ) : null}
      </div>
      {record || canCreate ? (
        <p className="mt-2 mb-0 text-[11px] text-slate-500">
          Handover page integration pending. No action is submitted from this
          view.
        </p>
      ) : null}
    </section>
  );
}
