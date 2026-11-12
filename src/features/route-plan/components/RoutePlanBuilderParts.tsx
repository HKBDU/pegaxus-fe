import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Handshake,
  PlusCircle,
  ShieldAlert,
  Trash2,
  Truck,
} from "lucide-react";
import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
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
import {
  VehicleSelectorFilterBar,
  filterVehicles,
  INITIAL_VEHICLE_FILTER_STATE,
  type VehicleFilterState,
} from "./VehicleSelectorFilterBar";
import type { RoutePlanStatus, RouteType, Vehicle, VehicleBrief } from "../types";
import type { DraftSegment } from "../builder-types";
import { assignmentStatusAllowed } from "../builder-segments";
export type { DraftSegment } from "../builder-types";
import { Checkbox } from "@/shared/components/ui/checkbox";

export type WizardStep = 0 | 1 | 2;

/** Dialog the Route Coordinator uses to pick the internal fleet vehicle of a segment (same layout as the provider dialog). */
function AssignVehicleDialog({
  open,
  onOpenChange,
  vehicles,
  selectedIds,
  selectedDetails,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  selectedIds: string[];
  selectedDetails: VehicleBrief[];
  onConfirm: (vehicleIds: string[]) => void;
}) {
  const [choice, setChoice] = useState<string[]>(selectedIds);
  const [filters, setFilters] = useState<VehicleFilterState>(INITIAL_VEHICLE_FILTER_STATE);

  const options = useMemo(
    () => [
      ...vehicles,
      ...selectedDetails.filter(
        (v) => selectedIds.includes(v.vehicleId) && !vehicles.some((item) => item.vehicleId === v.vehicleId),
      ),
    ],
    [vehicles, selectedDetails, selectedIds],
  );

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const v of vehicles) {
      if (v.vehicleType) types.add(v.vehicleType);
    }
    return Array.from(types).sort();
  }, [vehicles]);

  const filteredOptions = useMemo(
    () => filterVehicles(options, filters),
    [options, filters],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setChoice([...selectedIds]);
          setFilters(INITIAL_VEHICLE_FILTER_STATE);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select vehicles</DialogTitle>
          <DialogDescription>Select all fleet vehicles needed for this segment. Existing selections remain until you change them.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {options.length > 0 && (
            <VehicleSelectorFilterBar
              filters={filters}
              onFilterChange={setFilters}
              availableTypes={availableTypes}
              totalCount={options.length}
              filteredCount={filteredOptions.length}
              selectedCount={choice.length}
            />
          )}
          <fieldset className="grid max-h-72 gap-2 overflow-y-auto pr-1">
            <legend className="sr-only">Fleet vehicles</legend>
            {filteredOptions.map((vehicle) => (
              <label key={vehicle.vehicleId} className="flex min-w-0 items-start gap-3 rounded-[2px] border p-3 text-sm hover:bg-slate-50 transition-colors">
                <Checkbox checked={choice.includes(vehicle.vehicleId)} onCheckedChange={(checked) => setChoice((current) => checked === true ? [...new Set([...current, vehicle.vehicleId])] : current.filter((id) => id !== vehicle.vehicleId))} />
                <span className="min-w-0 break-words">{vehicle.vehicleName} · {vehicle.vehicleCode}{vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}{vehicle.capacityHorses != null ? ` (${vehicle.capacityHorses} horses)` : ""}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && options.length > 0 && (
              <div className="rounded-[2px] border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-600">
                No vehicles match your filter criteria.
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setFilters(INITIAL_VEHICLE_FILTER_STATE)}
                  className="ml-1 h-auto p-0 text-xs font-semibold text-amber-700 hover:underline"
                >
                  Reset filter
                </Button>
              </div>
            )}
            {selectedIds.filter((id) => !options.some((v) => v.vehicleId === id)).map((id) => (
              <label key={id} className="flex items-start gap-3 break-all border p-3 text-sm"><Checkbox checked={choice.includes(id)} onCheckedChange={(checked) => setChoice((current) => checked === true ? [...new Set([...current, id])] : current.filter((value) => value !== id))} /><span>{id} · Current selection</span></label>
            ))}
          </fieldset>
          {vehicles.length === 0 && (
            <p className="m-0 text-sm text-muted-foreground">No fleet vehicle is available for this time slot.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onConfirm(choice)}>
            Confirm vehicles
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

const ARRANGEMENT_STYLES = {
  INTERNAL: {
    label: "Internal fleet",
    icon: Building2,
    tone: "border-slate-300 bg-slate-50 text-slate-800",
    hover: "hover:border-slate-400 hover:bg-slate-100",
  },
  OUTSOURCED: {
    label: "Outsourced",
    icon: Handshake,
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    hover: "hover:border-amber-400 hover:bg-amber-100",
  },
} as const;

type ArrangementChipProps = ComponentPropsWithoutRef<"button"> & {
  arrangement: "INTERNAL" | "OUTSOURCED";
  /** Read-only roles see the same chip without the switch affordance. */
  interactive?: boolean;
};

/**
 * The segment's fleet arrangement. When it can be changed it reads as a button (border, hover, a switch icon) so the
 * coordinator knows a click switches between the internal fleet and an outsourced provider.
 */
const ArrangementChip = forwardRef<HTMLButtonElement, ArrangementChipProps>(
  ({ arrangement, interactive = true, className, ...props }, ref) => {
    const style = ARRANGEMENT_STYLES[arrangement];
    const Icon = style.icon;
    const content = (
      <>
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{style.label}</span>
      </>
    );
    const base =
      "inline-flex h-7 max-w-full items-center gap-1.5 rounded-[2px] border px-2 text-xs font-semibold";
    if (!interactive)
      return <span className={cn(base, style.tone, className)}>{content}</span>;
    return (
      <button
        ref={ref}
        type="button"
        title="Switch between the internal fleet and an outsourced provider"
        aria-label={`Arrangement: ${style.label}. Change arrangement`}
        className={cn(
          base,
          style.tone,
          style.hover,
          "cursor-pointer shadow-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {content}
        <ArrowLeftRight aria-hidden="true" className="ml-0.5 size-3 shrink-0 opacity-60" />
      </button>
    );
  },
);
ArrangementChip.displayName = "ArrangementChip";

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
  const [pendingVehicleIds, setPendingVehicleIds] = useState<string[] | null>(null);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [modeChoice, setModeChoice] = useState<"INTERNAL" | "OUTSOURCED" | null>(null);
  const principal = useAuthStore((state) => state.principal);
  // Fleet vehicles and providers are picked by the Route Coordinator while building the route plan.
  const canAssignResources = canAccess(principal, {
    anyRole: ["FLEET_ROUTE_COORDINATOR"],
  });
  // The Logistics Manager and Route Coordinator can link or remove a provider (OS1), never a vehicle.
  const canManageOutsource = canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"],
  });
  const canChangeArrangement = canAssignResources || canManageOutsource;
  const mode = modeChoice ?? segment.arrangement;
  const assignedVehicleIds = segment.vehicleIds ?? [];
  const assignedVehicles = assignedVehicleIds.map((id) => availableVehicles.find((v) => v.vehicleId === id) ?? segment.vehicleDetails?.find((v) => v.vehicleId === id));

  function commitVehicle(vehicleIds: string[]) {
    if (segment.arrangement === "OUTSOURCED") onOutsource(null);
    onVehicleChange?.(vehicleIds);
    setModeChoice(null);
  }

  function applyVehicle(vehicleIds: string[]) {
    setVehicleOpen(false);
    const originCountry = segment.route.fromLocation?.country?.trim().toUpperCase();
    if (vehicleIds.some((id) => {
      const vehicle = availableVehicles.find((v) => v.vehicleId === id);
      const country = vehicle?.country?.trim().toUpperCase();
      return originCountry && country && originCountry !== country;
    })) {
      setPendingVehicleIds(vehicleIds);
      return;
    }
    commitVehicle(vehicleIds);
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
                  {canChangeArrangement ? (
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
                      <ArrangementChip arrangement={segment.arrangement} />
                    </OutsourceSegmentDialog>
                  ) : (
                    <ArrangementChip arrangement={segment.arrangement} interactive={false} />
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
              <span className="min-w-0 flex-1 break-words font-semibold text-slate-800">
                {segment.arrangement === "OUTSOURCED"
                  ? (segment.provider?.providerName ?? "Select provider")
                  : assignedVehicleIds.length
                    ? assignedVehicleIds.map((id, i) => {
                        const vehicle = assignedVehicles[i];
                        return vehicle ? `${vehicle.vehicleName} · ${vehicle.vehicleCode}${vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}` : id;
                      }).join("; ")
                    : "Select vehicle"}
              </span>
              {(segment.arrangement === "OUTSOURCED" ? canManageOutsource : canAssignResources) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 rounded-[2px] px-2 text-xs"
                  onClick={() => (mode === "OUTSOURCED" ? setProviderOpen(true) : setVehicleOpen(true))}
                >
                  {mode === "OUTSOURCED"
                    ? segment.arrangement === "OUTSOURCED" ? "Change provider" : "Assign provider"
                    : assignedVehicleIds.length && segment.arrangement === "INTERNAL" ? "Change vehicle" : "Select vehicle"}
                </Button>
              )}
            </div>
            {segment.assignmentOrigin === "inherited" && segment.arrangement === "INTERNAL" && (
              <p className="mt-1 text-xs text-amber-800">Inherited from PRIMARY · Segment {segment.inheritanceSource}</p>
            )}
            {segment.assignmentReason && <p className="mt-1 text-xs text-muted-foreground">{segment.assignmentReason}</p>}
            {canAssignResources && vehicleOpen && (
              <AssignVehicleDialog
                open={vehicleOpen}
                onOpenChange={setVehicleOpen}
                vehicles={availableVehicles.filter((v) => assignmentStatusAllowed(v) && v.transportMode === segment.route.transportMode && v.isAvailable !== false)}
                selectedIds={segment.arrangement === "INTERNAL" ? assignedVehicleIds : []}
                selectedDetails={segment.vehicleDetails ?? []}
                onConfirm={applyVehicle}
              />
            )}
            {canManageOutsource && (
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
            )}
            <AlertDialog open={Boolean(pendingVehicleIds)} onOpenChange={(open) => !open && setPendingVehicleIds(null)}>
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
                      if (pendingVehicleIds) commitVehicle(pendingVehicleIds);
                      setPendingVehicleIds(null);
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
