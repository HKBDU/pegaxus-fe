import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardCheck, MapPin } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { handoverCreateModes } from "@/features/handover/utils";
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
import { transportHandoversPath } from "../navigation";
import { isSameDriverBoundary } from "../timeline";
import type {
  HandoverBoundary,
  TrackingSegment,
  TransportAudience,
} from "../types";

const supportedTypes = [
  "PICKUP",
  "TRANSFER",
  "BORDER_HANDOVER",
  "CARRIER_HANDOVER",
  "DELIVERY",
  "OTHER",
];

export function TransportHandoverBoundary({
  boundary,
  audience,
  position,
  segments,
}: {
  boundary: HandoverBoundary;
  audience: TransportAudience;
  position: "pickup" | "transfer" | "delivery" | "unmatched";
  segments: TrackingSegment[];
}) {
  const principal = useAuthStore((state) => state.principal);
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const [selection, setSelection] = useState("");
  const sameDriver =
    position === "transfer" && isSameDriverBoundary(boundary, segments);
  const exempt = position === "transfer" && sameDriver;
  const unverifiedExemption =
    position === "transfer" &&
    boundary.handoverRequired === false &&
    !sameDriver;
  const availableTypes = (
    exempt || unverifiedExemption ? [] : boundary.allowedHandoverTypes
  ).filter((value) => supportedTypes.includes(value));
  const selected = availableTypes.includes(selection)
    ? selection
    : availableTypes.length === 1
      ? availableTypes[0]
      : "";
  const modes = handoverCreateModes(
    boundary,
    new Map(segments.map((segment) => [segment.routePlanRouteId, segment])),
    principal,
  ).filter((mode) => audience === "admin" || mode !== "SCHEDULE");
  const canCreate =
    audience !== "customer" &&
    !exempt &&
    position !== "unmatched" &&
    modes.length > 0 &&
    boundary.canCreate &&
    !boundary.existingHandover &&
    availableTypes.length > 0;
  const record = boundary.existingHandover;
  const handoversPath = transportId
    ? transportHandoversPath(transportId, audience, bookingId)
    : undefined;
  // The handover page reads the boundary and the type from the query and asks for a last confirmation.
  const createPath = (mode: string) =>
    handoversPath && selected
      ? `${handoversPath}/new?${new URLSearchParams({
          handoverType: selected,
          mode,
          ...(boundary.fromRoutePlanRouteId
            ? { fromRoutePlanRouteId: boundary.fromRoutePlanRouteId }
            : {}),
          ...(boundary.toRoutePlanRouteId
            ? { toRoutePlanRouteId: boundary.toRoutePlanRouteId }
            : {}),
        })}`
      : undefined;
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
          {exempt ? (
            <p className="m-0 pt-1 text-xs text-slate-500">
              Không cần biên bản giữa hai chặng cùng Driver. Giờ đến chỉ cập
              nhật từ popup GPS.
            </p>
          ) : unverifiedExemption ? (
            <p className="m-0 pt-1 text-xs text-amber-800">
              Server reports a handover exemption without a verified same-Driver
              pair. Reload before creating a record.
            </p>
          ) : boundary.handoverRequired === undefined ||
            boundary.createModes === undefined ? (
            <p className="m-0 pt-1 text-xs text-slate-500">
              Backend chưa trả đủ capability mới. Chỉ giữ thao tác legacy khi
              canCreate và quyền hiện có cho phép.
            </p>
          ) : boundary.handoverRequired &&
            record &&
            record.status !== "COMPLETED" ? (
            <p className="m-0 pt-1 text-xs text-amber-800">
              Chờ hoàn tất biên bản; mốc thời gian chính thức do máy chủ xác
              nhận.
            </p>
          ) : null}
          {boundary.arrivalAt ? (
            <p className="m-0 text-xs text-slate-500">
              Arrival: {new Date(boundary.arrivalAt).toLocaleString()}
            </p>
          ) : null}
          {boundary.createModes &&
          boundary.createModes.length > 0 &&
          !exempt ? (
            <p className="m-0 text-xs text-slate-500">
              Creation modes:{" "}
              {boundary.createModes.map(formatTransportLabel).join(" / ")}
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
          ) : !exempt && boundary.allowedHandoverTypes.length > 0 ? (
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
        {record && handoversPath ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-xs text-xs"
          >
            <Link
              to={`${handoversPath}/${encodeURIComponent(record.handoverRecordId)}`}
              aria-label={`View handover ${record.handoverCode}`}
            >
              View Handover Record
            </Link>
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
            {modes.map((mode) => (
              <Button
                key={mode}
                asChild={Boolean(createPath(mode))}
                type="button"
                size="sm"
                variant="outline"
                disabled={!createPath(mode)}
                className="rounded-xs text-xs"
              >
                {createPath(mode) ? (
                  <Link to={createPath(mode)!}>
                    {mode === "SCHEDULE"
                      ? "Schedule Handover"
                      : "Start Handover Now"}
                  </Link>
                ) : (
                  "Create Handover Record"
                )}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
