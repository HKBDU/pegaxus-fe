import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Truck } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";

import { VEHICLE_STATUS_LABELS } from "../constants";
import { loadAllVehicles } from "../api-adapters";
import {
  getChangeRoutePlanVehiclesError,
  useChangeRoutePlanVehicles,
} from "../hooks";
import type {
  ChangeRoutePlanVehiclesResult,
  ChangeVehiclesMode,
  Vehicle,
} from "../types";

type ChangeableSegment = {
  routePlanRouteId: string;
  sequenceNo: number;
  route: { transportMode: "ROAD" | "SEA" | "AIR" };
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  fromLocation: { locationName: string };
  toLocation: { locationName: string };
  vehicles: Array<{ vehicleId: string }>;
};

export interface ChangeVehiclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChangeVehiclesMode;
  routePlan: { routePlanId: string; transportPlanId: string; updatedAt: string };
  segments: ChangeableSegment[];
  incidentReportId?: string;
  onChanged?: (result: ChangeRoutePlanVehiclesResult) => void;
  onReload?: () => void;
  vehiclesBySegment?: Record<string, Vehicle[]>;
}

type VehicleOptions = Record<string, Vehicle[]>;

const modeCopy: Record<ChangeVehiclesMode, { title: string; description: string }> = {
  "before-departure": {
    title: "Change vehicles",
    description: "Choose vehicles for each segment.",
  },
  "mid-trip": {
    title: "Change vehicles",
    description: "Choose vehicles for the affected segments.",
  },
};

function dateOnly(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function vehicleName(vehicle: Vehicle) {
  return `${vehicle.vehicleCode} · ${vehicle.vehicleName}`;
}

export function ChangeVehiclesDialog({
  open,
  onOpenChange,
  mode,
  routePlan,
  segments,
  incidentReportId,
  onChanged,
  onReload,
  vehiclesBySegment,
}: ChangeVehiclesDialogProps) {
  const mutation = useChangeRoutePlanVehicles();
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOptions>({});
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string[]>>({});
  const [reason, setReason] = useState("");
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState(false);
  const [result, setResult] = useState<ChangeRoutePlanVehiclesResult | null>(null);

  const copy = modeCopy[mode];
  const mappedError = mutation.error ? getChangeRoutePlanVehiclesError(mutation.error) : null;
  const missingIncident = mode === "mid-trip" && !incidentReportId;
  const selectedSegmentCount = segments.filter(
    (segment) => (selectedVehicles[segment.routePlanRouteId]?.length ?? 0) > 0,
  ).length;
  const canSubmit = !missingIncident && reason.trim().length > 0 && selectedSegmentCount > 0;

  const segmentKey = useMemo(
    () => segments.map((segment) => segment.routePlanRouteId).join(","),
    [segments],
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoadingVehicles(true);
    setVehicleOptions({});
    setVehicleLoadError(false);
    setResult(null);
    setSelectedVehicles(
      Object.fromEntries(
        segments.map((segment) => [
          segment.routePlanRouteId,
          segment.vehicles.map((vehicle) => vehicle.vehicleId),
        ]),
      ),
    );

    if (vehiclesBySegment) {
      setVehicleOptions(vehiclesBySegment);
      setIsLoadingVehicles(false);
      return;
    }

    void Promise.all(
      segments.map(async (segment) => {
        const vehicles = await loadAllVehicles({
          availableFrom: dateOnly(segment.plannedDepartureAt),
          availableTo: dateOnly(segment.plannedArrivalAt),
          transportMode: segment.route.transportMode,
          transportPlanId: routePlan.transportPlanId,
        });
        return [segment.routePlanRouteId, vehicles] as const;
      }),
    )
      .then((entries) => {
        if (active) setVehicleOptions(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) setVehicleLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoadingVehicles(false);
      });

    return () => {
      active = false;
    };
  }, [open, routePlan.transportPlanId, segmentKey, segments, vehiclesBySegment]);

  function toggleVehicle(segmentId: string, vehicleId: string, checked: boolean) {
    setSelectedVehicles((current) => {
      const selected = current[segmentId] ?? [];
      return {
        ...current,
        [segmentId]: checked
          ? [...new Set([...selected, vehicleId])]
          : selected.filter((id) => id !== vehicleId),
      };
    });
  }

  function skipSegment(segmentId: string) {
    setSelectedVehicles((current) => ({ ...current, [segmentId]: [] }));
  }

  function submit() {
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate(
      {
        routePlanId: routePlan.routePlanId,
        mode,
        payload: {
          lastUpdatedAt: routePlan.updatedAt,
          reason: reason.trim(),
          ...(mode === "mid-trip" ? { incidentReportId } : {}),
          segments: segments.flatMap((segment) => {
            const vehicleIds = selectedVehicles[segment.routePlanRouteId] ?? [];
            if (vehicleIds.length === 0) return [];
            return [{
              ...(mode === "mid-trip"
                ? { routePlanRouteId: segment.routePlanRouteId }
                : { sequenceNo: segment.sequenceNo }),
              vehicleIds,
            }];
          }),
        },
      },
      {
        onSuccess: (result) => {
          setResult(result);
          onChanged?.(result);
        },
      },
    );
  }

  function reloadRoutePlan() {
    if (onReload) onReload();
    else window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2px] border-slate-300 bg-slate-50 p-0 text-slate-950">
        <DialogHeader className="border-b border-slate-300 bg-white px-6 py-5 text-left">
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-10 shrink-0 place-items-center rounded-[2px] bg-slate-900 text-white">
              <Truck className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-950">{copy.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-600">
                {copy.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {mappedError && (
            <div className="flex items-start gap-3 rounded-[2px] border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{mappedError.message}</p>
                {mappedError.shouldReload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-[2px] border-red-400 bg-white text-red-900 hover:bg-red-100"
                    onClick={reloadRoutePlan}
                  >
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Reload route plan
                  </Button>
                )}
              </div>
            </div>
          )}

          {vehicleLoadError && (
            <div className="flex items-start gap-3 rounded-[2px] border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
              <p className="font-semibold">Unable to load vehicles. Please try again.</p>
            </div>
          )}

          {result && (
            <div className="rounded-[2px] border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
              <p className="font-bold">Vehicle changes applied successfully.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[2px] border border-emerald-200 bg-white p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-800">Released</span>
                  <span className="text-lg font-bold">{result.releasedVehicleIds.length}</span>
                </div>
                <div className="rounded-[2px] border border-emerald-200 bg-white p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-800">Maintenance</span>
                  <span className="text-lg font-bold">{result.maintenanceVehicleIds.length}</span>
                </div>
                <div className="rounded-[2px] border border-emerald-200 bg-white p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-800">Auto-applied segments</span>
                  <span className="text-lg font-bold">{result.appliedSegmentIds.length}</span>
                </div>
              </div>
            </div>
          )}

          {segments.length === 0 ? (
            <div className="rounded-[2px] border border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-700">
              No segments are available for vehicle replacement.
            </div>
          ) : (
            <div className="grid gap-3">
              {segments.map((segment) => {
                const selected = selectedVehicles[segment.routePlanRouteId] ?? [];
                const options = vehicleOptions[segment.routePlanRouteId] ?? [];
                return (
                  <Card key={segment.routePlanRouteId} className="rounded-[2px] border-slate-300 bg-white shadow-sm">
                    <CardHeader className="border-b border-slate-200 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-sm font-bold text-slate-950">
                          Segment {segment.sequenceNo}: {segment.fromLocation.locationName} → {segment.toLocation.locationName}
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0 rounded-[2px] border-slate-400 bg-slate-100 text-slate-800">
                          {selected.length > 0 ? "Selected" : "Unchanged"}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {segment.route.transportMode} · {segment.plannedDepartureAt} – {segment.plannedArrivalAt}
                      </p>
                    </CardHeader>
                    <CardContent className="grid gap-2 px-4 py-4">
                      {isLoadingVehicles ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Skeleton className="h-16 rounded-[2px] bg-slate-200" />
                          <Skeleton className="h-16 rounded-[2px] bg-slate-200" />
                        </div>
                      ) : vehicleLoadError ? null : options.length === 0 ? (
                        <p className="border border-dashed border-slate-400 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                          No vehicles found.
                        </p>
                      ) : (
                        <div
                          className="grid gap-2 sm:grid-cols-2"
                          role="group"
                          aria-label={`Choose vehicles for segment ${segment.sequenceNo}`}
                        >
                          {options.map((vehicle) => {
                            const id = `vehicle-${segment.routePlanRouteId}-${vehicle.vehicleId}`;
                            const checked = selected.includes(vehicle.vehicleId);
                            return (
                              <Label
                                key={vehicle.vehicleId}
                                htmlFor={id}
                                className={`flex cursor-pointer items-start gap-3 rounded-[2px] border p-3 transition-colors ${
                                  checked
                                    ? "border-slate-900 bg-slate-100"
                                    : "border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                <Checkbox
                                  id={id}
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    toggleVehicle(
                                      segment.routePlanRouteId,
                                      vehicle.vehicleId,
                                      value === true,
                                    )
                                  }
                                  className="mt-0.5 rounded-[2px] border-slate-500 text-slate-900"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold text-slate-950">{vehicleName(vehicle)}</span>
                                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs font-medium text-slate-600">
                                    <span>{vehicle.licensePlate ?? "No plate"}</span>
                                    <span>{vehicle.capacityHorses} horses</span>
                                    <Badge variant="outline" className="rounded-[2px] border-slate-400 px-1.5 py-0 text-[10px] text-slate-800">
                                      {VEHICLE_STATUS_LABELS[vehicle.status]}
                                    </Badge>
                                  </span>
                                </span>
                              </Label>
                            );
                          })}
                        </div>
                      )}
                      {selected.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-fit rounded-[2px] px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                          onClick={() => skipSegment(segment.routePlanRouteId)}
                        >
                          Do not change this segment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="change-vehicles-reason" className="text-sm font-bold text-slate-950">
              Reason for vehicle change <span className="text-red-700">*</span>
            </Label>
            <Textarea
              id="change-vehicles-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the current vehicle assignment must change."
              maxLength={2000}
              className="min-h-24 rounded-[2px] border-slate-400 bg-white text-slate-950 placeholder:text-slate-500 focus-visible:ring-slate-700"
            />
            {missingIncident && (
              <p className="text-xs font-semibold text-red-700" role="alert">
                Select the incident before continuing.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-300 bg-white px-6 py-4 sm:justify-between">
          <p className="text-xs font-medium text-slate-600">{selectedSegmentCount} segment{selectedSegmentCount === 1 ? "" : "s"} selected.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="rounded-[2px] border-slate-400 bg-white text-slate-900 hover:bg-slate-100" onClick={() => onOpenChange(false)}>
              CANCEL
            </Button>
            <Button
              type="button"
              className="rounded-[2px] bg-[#f39200] text-slate-950 hover:bg-[#d97f00]"
              disabled={!canSubmit || mutation.isPending || isLoadingVehicles}
              onClick={submit}
            >
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              APPLY
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
