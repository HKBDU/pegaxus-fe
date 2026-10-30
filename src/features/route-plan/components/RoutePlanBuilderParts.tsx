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
import { formatUtcDateTime, formatUtcTime } from "@/shared/utils/datetime";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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

/** Dialog the Route Coordinator uses to pick the internal fleet vehicle of a segment. */
function AssignVehicleDialog({
  open,
  onOpenChange,
  vehicles,
  selectedId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  selectedId: string | null;
  onConfirm: (vehicleId: string | null) => void;
}) {
  const [choice, setChoice] = useState<string | null>(selectedId);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setChoice(selectedId);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Assign vehicle</DialogTitle>
          <DialogDescription>Select an available fleet vehicle for this segment.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Fleet vehicle" className="grid max-h-72 gap-1.5 overflow-y-auto">
          {[null, ...vehicles].map((vehicle) => {
            const id = vehicle?.vehicleId ?? null;
            const checked = choice === id;
            return (
              <button
                key={id ?? "NONE"}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setChoice(id)}
                className={`flex items-center justify-between gap-3 rounded-[2px] border px-3 py-2 text-left text-xs transition-colors ${
                  checked ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {vehicle ? (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{vehicle.vehicleName}</span>
                      <span className="block truncate text-slate-500">
                        {vehicle.vehicleCode}
                        {vehicle.licensePlate ? ` • ${vehicle.licensePlate}` : ""}
                        {vehicle.country ? ` • ${vehicle.country}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-600">{vehicle.capacityHorses} horses</span>
                  </>
                ) : (
                  <span className="text-slate-600">No vehicle assigned</span>
                )}
              </button>
            );
          })}
          {vehicles.length === 0 && (
            <p className="m-0 text-xs text-slate-500">No fleet vehicle is available for this time slot.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onConfirm(choice)}>
            Confirm vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  return formatUtcDateTime(value);
}

function formatShortTime(value?: string) {
  return formatUtcTime(value);
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
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [modeChoice, setModeChoice] = useState<"INTERNAL" | "OUTSOURCED" | null>(null);
  const principal = useAuthStore((state) => state.principal);
  // Fleet vehicles and providers are picked by the Route Coordinator while building the route plan.
  const canAssignResources = canAccess(principal, {
    anyRole: ["FLEET_ROUTE_COORDINATOR"],
  });
  // The Logistics Manager can only link or remove a provider (OS1), never a vehicle.
  const canManageOutsource = canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER"],
  });
  const mode = modeChoice ?? segment.arrangement;
  const assignedVehicleId = segment.vehicleIds?.[0] ?? null;
  const assignedVehicle = availableVehicles.find((vehicle) => vehicle.vehicleId === assignedVehicleId);

  function commitVehicle(vehicleId: string | null) {
    if (segment.arrangement === "OUTSOURCED") onOutsource(null);
    onVehicleChange?.(vehicleId ? [vehicleId] : []);
    setModeChoice(null);
  }

  function applyVehicle(vehicleId: string | null) {
    setVehicleOpen(false);
    if (!vehicleId) {
      commitVehicle(null);
      return;
    }
    const selected = availableVehicles.find((vehicle) => vehicle.vehicleId === vehicleId);
    const originCountry = segment.route.fromLocation?.country?.trim().toUpperCase();
    const vehicleCountry = selected?.country?.trim().toUpperCase();
    if (originCountry && vehicleCountry && originCountry !== vehicleCountry) {
      setPendingVehicleId(vehicleId);
      return;
    }
    commitVehicle(vehicleId);
  }

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
                  {canAssignResources ? (
                    <Select
                      value={mode}
                      onValueChange={(value) => setModeChoice(value === segment.arrangement ? null : (value as "INTERNAL" | "OUTSOURCED"))}
                    >
                      <SelectTrigger
                        className="h-7 w-full min-w-0 rounded-[2px] border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900"
                        aria-label="Arrangement"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="INTERNAL" className="text-xs">Internal</SelectItem>
                        <SelectItem value="OUTSOURCED" className="text-xs">Outsource</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : canManageOutsource ? (
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

            {/* Assigned vehicle / provider of the segment */}
            <div className="mt-2 flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs">
              <Truck className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-muted-foreground">
                {segment.arrangement === "OUTSOURCED" ? "Provider:" : "Fleet Vehicle:"}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                {segment.arrangement === "OUTSOURCED"
                  ? (segment.provider?.providerName ?? "Provider linked")
                  : assignedVehicle
                    ? `${assignedVehicle.vehicleName} (${assignedVehicle.capacityHorses} horses)${assignedVehicle.licensePlate ? ` • ${assignedVehicle.licensePlate}` : ""}`
                    : assignedVehicleId
                      ? "Vehicle assigned"
                      : "Not assigned"}
              </span>
              {canAssignResources && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 rounded-[2px] px-2 text-xs"
                  onClick={() => (mode === "OUTSOURCED" ? setProviderOpen(true) : setVehicleOpen(true))}
                >
                  {mode === "OUTSOURCED"
                    ? segment.arrangement === "OUTSOURCED" ? "Change provider" : "Assign provider"
                    : assignedVehicleId && segment.arrangement === "INTERNAL" ? "Change vehicle" : "Assign vehicle"}
                </Button>
              )}
            </div>
            {canAssignResources && (
              <>
                <AssignVehicleDialog
                  open={vehicleOpen}
                  onOpenChange={setVehicleOpen}
                  vehicles={availableVehicles}
                  selectedId={segment.arrangement === "INTERNAL" ? assignedVehicleId : null}
                  onConfirm={applyVehicle}
                />
                <OutsourceSegmentDialog
                  routePlanRouteId={segment.route.routePlanRouteId ?? String(segment.route.id)}
                  transportMode={segment.route.transportMode ?? "ROAD"}
                  isOutsourced={false}
                  currentProvider={segment.provider}
                  currentNote={segment.note}
                  lastUpdatedAt=""
                  open={providerOpen}
                  onOpenChange={setProviderOpen}
                  onChanged={(selection) => {
                    onOutsource(selection);
                    if (selection) onVehicleChange?.([]);
                    setModeChoice(null);
                  }}
                >
                  <span className="sr-only">Assign provider</span>
                </OutsourceSegmentDialog>
              </>
            )}
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
                  <AlertDialogAction
                    className="rounded-[2px]"
                    onClick={() => {
                      if (pendingVehicleId) commitVehicle(pendingVehicleId);
                      setPendingVehicleId(null);
                    }}
                  >
                    Continue selecting
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
