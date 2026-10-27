import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  PlusCircle,
  ShieldAlert,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { MapLocation, MapRoute } from "@/shared/components/map";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  OutsourceSegmentDialog,
  type OutsourceSegmentSelection,
} from "./OutsourceSegmentDialog";
import type { Provider, RoutePlanStatus, RouteType, Vehicle } from "../types";

export type WizardStep = 0 | 1 | 2;

export type TransportPlanSummary = {
  transportPlanId: string;
  planCode: string;
  bookingCode: string;
  routeType: RouteType;
  status: RoutePlanStatus;
  scope: "International" | "Domestic";
  departureAt: string;
  arrivalAt: string;
  requestedArrivalAt?: string | null;
  from: MapLocation;
  to: MapLocation;
};

export type RoutePlanBuilderMetadata = Partial<
  Omit<TransportPlanSummary, "from" | "to">
> & {
  from?: MapLocation;
  to?: MapLocation;
  isFromResolved?: boolean;
  isToResolved?: boolean;
  unresolvedOriginAddress?: string;
  unresolvedDestinationAddress?: string;
  requestedArrivalAt?: string | null;
};

export type DraftSegment = {
  id: string;
  sequenceNo?: number;
  route: MapRoute;
  arrangement: "INTERNAL" | "OUTSOURCED";
  stopType: "REST_STOP" | "BCP" | "DESTINATION";
  provider?: Provider;
  note?: string;
  dwellAfterMinutes?: number;
  plannedDepartureAt?: string;
  plannedArrivalAt?: string;
  vehicleIds?: string[];
  isDisconnected?: boolean;
};

export function arrangementForRoute(
  route: MapRoute,
): "INTERNAL" | "OUTSOURCED" {
  return route.isOutsourced ?? route.transportMode !== "ROAD"
    ? "OUTSOURCED"
    : "INTERNAL";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatShortTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function Metadata({ plan }: { plan: TransportPlanSummary }) {
  const items = [
    ["TRANSPORT PLAN", plan.planCode],
    ["BOOKING", plan.bookingCode],
    ["SCOPE", plan.scope],
    ["PLANNED DEPARTURE", formatDate(plan.departureAt)],
    ["PLANNED ARRIVAL", formatDate(plan.arrivalAt)],
  ];

  return (
    <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-[2px] bg-card sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="min-h-16 p-0">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

const steps = ["Transport Details", "Route Builder", "Save"];

export function Progress({
  step,
  onChange,
}: {
  step: WizardStep;
  onChange: (step: WizardStep) => void;
}) {
  return (
    <div className="grid overflow-hidden rounded-t-[2px] bg-card sm:grid-cols-3">
      {steps.map((label, index) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(index as WizardStep)}
          className={`border-b-2 px-2 py-1 text-center transition ${step === index ? "border-amber-500 text-slate-900" : "border-transparent text-muted-foreground"}`}
        >
          <span className="block font-[var(--heading)] text-lg font-bold uppercase">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SegmentCard({
  segment,
  index,
  totalSegments = 1,
  isLatest = false,
  isReversedOrder = false,
  onSplitAtBcp,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertStop,
  onOutsource,
  onDwellChange,
  onVehicleChange,
  availableVehicles = [],
  routePlanId,
  lastUpdatedAt,
}: {
  segment: DraftSegment;
  index: number;
  totalSegments?: number;
  isLatest?: boolean;
  isReversedOrder?: boolean;
  onSplitAtBcp?: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertStop?: () => void;
  onOutsource: (selection: OutsourceSegmentSelection | null) => void;
  onDwellChange?: (minutes: number) => void;
  onVehicleChange?: (vehicleIds: string[]) => void;
  availableVehicles?: Vehicle[];
  routePlanId?: string;
  lastUpdatedAt?: string;
}) {
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null);
  const principal = useAuthStore((state) => state.principal);
  const canManageOutsource = canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER"],
  });

  const durationMins = segment.route.durationMinutes ?? 0;
  const isLongTransit = durationMins > 540; // Over 9 hours continuous drive

  return (
    <Card
      className={`w-full min-w-0 overflow-hidden gap-2 rounded-[2px] py-2 shadow-sm transition ${
        segment.isDisconnected ? "border-red-300 bg-red-50/10" : ""
      }`}
    >
      <CardContent className="px-3 min-w-0 w-full overflow-hidden">
        <div className="flex items-start gap-2 min-w-0 w-full overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[2px] bg-slate-700 text-xs font-bold text-white">
              {index + 1}
            </span>
            {isLatest && totalSegments > 1 && (
              <Badge className="rounded-[2px] bg-amber-500 text-white text-[10px] px-1.5 py-0 font-semibold shrink-0">
                Latest
              </Badge>
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-start justify-between gap-2 min-w-0 w-full">
              <div className="min-w-0 flex-1 overflow-hidden">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p
                        className="cursor-default truncate font-semibold text-slate-900"
                        title={`${segment.route.fromLocation?.name ?? "—"} → ${segment.route.toLocation?.name ?? "—"}`}
                      >
                        {segment.route.fromLocation?.name}{" "}
                        <span className="text-slate-400">→</span>{" "}
                        {segment.route.toLocation?.name}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-sm break-words rounded-[2px] bg-slate-900 px-3 py-2 text-xs text-white shadow-md z-50"
                    >
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold uppercase text-[10px] text-amber-400 shrink-0">From:</span>
                          <span className="text-slate-100">{segment.route.fromLocation?.name ?? "—"}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold uppercase text-[10px] text-amber-400 shrink-0">To:</span>
                          <span className="text-slate-100">{segment.route.toLocation?.name ?? "—"}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {segment.route.name && (
                  <p
                    className="truncate text-[11px] text-muted-foreground"
                    title={segment.route.name}
                  >
                    {segment.route.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {onSplitAtBcp && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-1.5 text-[10px] font-semibold text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-[2px] shrink-0"
                    onClick={onSplitAtBcp}
                    title="Split this cross-border route at a Border Control Point (BCP)"
                  >
                    <ShieldAlert className="mr-1 size-3 text-amber-600" />
                    Split at BCP
                  </Button>
                )}
                {/* When displayed in reversed order (newest on top), visually moving UP means increasing index in route, while visually moving DOWN means decreasing index */}
                {onMoveUp && (
                  <button
                    type="button"
                    disabled={isReversedOrder ? index === totalSegments - 1 : index === 0}
                    onClick={onMoveUp}
                    title={isReversedOrder ? "Move later in route (Move up visually)" : "Move earlier in route"}
                    aria-label="Move segment up"
                    className="rounded-[2px] p-1 text-muted-foreground hover:bg-muted hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                )}
                {onMoveDown && (
                  <button
                    type="button"
                    disabled={isReversedOrder ? index === 0 : index === totalSegments - 1}
                    onClick={onMoveDown}
                    title={isReversedOrder ? "Move earlier in route (Move down visually)" : "Move later in route"}
                    aria-label="Move segment down"
                    className="rounded-[2px] p-1 text-muted-foreground hover:bg-muted hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                )}
                {onInsertStop && (
                  <button
                    type="button"
                    onClick={onInsertStop}
                    title="Insert intermediate stop"
                    aria-label="Insert intermediate stop"
                    className="rounded-[2px] p-1 text-muted-foreground hover:bg-muted hover:text-amber-600"
                  >
                    <PlusCircle className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDelete}
                  title="Delete segment"
                  aria-label="Delete segment"
                  className="rounded-[2px] p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            {segment.isDisconnected && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-[2px] border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800">
                <AlertTriangle className="size-3.5 shrink-0 text-red-600" />
                <span>Discontinuous segment (origin does not match previous destination)</span>
              </div>
            )}

            {isLongTransit && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-[2px] border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
                <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                <span>Continuous transit exceeds 9h. Recommended to add a rest stop for equine welfare.</span>
              </div>
            )}

            {/* Metrics grid */}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Distance</p>
                <p className="font-semibold">
                  {segment.route.distanceKm != null ? `${Math.round(segment.route.distanceKm * 10) / 10} km` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated drive</p>
                <p className="font-semibold">
                  {segment.route.durationMinutes
                    ? `${Math.floor(segment.route.durationMinutes / 60)}h ${Math.round(segment.route.durationMinutes % 60)}m`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Stop type</p>
                <Badge variant="outline" className="mt-1 border-0 px-0">
                  {segment.stopType.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Arrangement</span>
                <div className="mt-1">
                  {canManageOutsource ? (
                    <OutsourceSegmentDialog
                      routePlanId={routePlanId}
                      routePlanRouteId={segment.route.routePlanRouteId ?? String(segment.route.id)}
                      transportMode={segment.route.transportMode ?? "ROAD"}
                      isOutsourced={segment.arrangement === "OUTSOURCED"}
                      currentProvider={segment.provider}
                      currentNote={segment.note}
                      lastUpdatedAt={lastUpdatedAt ?? ""}
                      onChanged={(sel) => {
                        onOutsource(sel);
                        if (sel) onVehicleChange?.([]);
                      }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        {segment.arrangement === "OUTSOURCED" ? "Outsource" : "Internal"}
                      </Button>
                    </OutsourceSegmentDialog>
                  ) : (
                    <span className="font-semibold">
                      {segment.arrangement === "OUTSOURCED" ? "Outsource" : "Internal"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline row */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-muted-foreground">Dep: </span>
                  <span className="font-semibold text-slate-800">
                    {formatShortTime(segment.plannedDepartureAt)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Arr: </span>
                  <span className="font-semibold text-slate-800">
                    {formatShortTime(segment.plannedArrivalAt)}
                  </span>
                </div>
              </div>

              {/* Dwell / Rest input */}
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <label className="flex items-center gap-1 text-muted-foreground">
                  <span>Rest:</span>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    aria-label="Rest Time (Minutes)"
                    value={segment.dwellAfterMinutes ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      onDwellChange?.(val);
                    }}
                    className="h-6 w-14 rounded-[2px] border border-slate-200 bg-white px-1 text-right text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span>min</span>
                </label>
              </div>
            </div>

            {/* Vehicle selection for internal segments */}
            {segment.arrangement === "INTERNAL" && availableVehicles.length > 0 && (
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs min-w-0 w-full">
                <Truck className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Fleet Vehicle:</span>
                <div className="min-w-0 flex-1">
                  <Select
                    value={segment.vehicleIds?.[0] ?? "NONE"}
                    onValueChange={(val) => {
                      if (val === "NONE") { onVehicleChange?.([]); return; }
                      const selected = availableVehicles.find((vehicle) => vehicle.vehicleId === val);
                      const originCountry = segment.route.fromLocation?.country?.trim().toUpperCase();
                      const vehicleCountry = selected?.country?.trim().toUpperCase();
                      if (originCountry && vehicleCountry && originCountry !== vehicleCountry) {
                        setPendingVehicleId(val);
                        return;
                      }
                      onVehicleChange?.([val]);
                    }}
                  >
                    <SelectTrigger className="h-7 w-full min-w-0 rounded-[2px] border border-slate-200 bg-white px-2 text-xs font-normal text-slate-900 *:data-[slot=select-value]:truncate" aria-label="Assign vehicle">
                      <SelectValue placeholder="-- No vehicle assigned --" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[360px] max-h-60 text-xs">
                      <SelectItem value="NONE" className="text-xs">-- No vehicle assigned --</SelectItem>
                      {availableVehicles.map((v) => (
                        <SelectItem key={v.vehicleId} value={v.vehicleId} className="text-xs">
                          {v.vehicleName} ({v.capacityHorses} horses){v.licensePlate ? ` • ${v.licensePlate}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AlertDialog open={Boolean(pendingVehicleId)} onOpenChange={(open) => !open && setPendingVehicleId(null)}>
                  <AlertDialogContent className="rounded-[2px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Vehicle country differs from departure</AlertDialogTitle>
                      <AlertDialogDescription>
                        This vehicle is based in a different country from the segment departure location. Do you still want to assign it?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-[2px]">Choose another</AlertDialogCancel>
                      <AlertDialogAction className="rounded-[2px]" onClick={() => { if (pendingVehicleId) onVehicleChange?.([pendingVehicleId]); setPendingVehicleId(null); }}>Continue selecting</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
