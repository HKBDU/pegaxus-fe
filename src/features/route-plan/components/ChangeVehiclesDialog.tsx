import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
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

export type ChangeableSegment = {
  routePlanRouteId: string;
  sequenceNo: number;
  route: { transportMode: "ROAD" | "SEA" | "AIR" };
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  fromLocation: { locationName: string };
  toLocation: { locationName: string };
  vehicles: Array<{ vehicleId: string }>;
};

export type ChangeVehiclesSnapshot = {
  routePlan: { routePlanId: string; transportPlanId: string; updatedAt: string };
  segments: ChangeableSegment[];
};

function changedVehicleSegments(
  segments: ChangeableSegment[],
  selectedVehicles: Record<string, string[]>,
  selectedSegments: Record<string, boolean>,
) {
  return segments.filter((segment) => {
    const selected = selectedVehicles[segment.routePlanRouteId] ?? [];
    const original = segment.vehicles.map((vehicle) => vehicle.vehicleId.toLowerCase());
    return selectedSegments[segment.routePlanRouteId] && selected.length > 0 &&
      (selected.length !== original.length || selected.some((id) => !original.includes(id.toLowerCase())));
  });
}

export interface ChangeVehiclesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChangeVehiclesMode;
  routePlan: { routePlanId: string; transportPlanId: string; updatedAt: string };
  segments: ChangeableSegment[];
  incidentReportId?: string;
  onChanged?: (result: ChangeRoutePlanVehiclesResult) => void | Promise<unknown>;
  onBeforeSubmit?: (snapshot: ChangeVehiclesSnapshot) => void;
  onReload?: () => void | Promise<unknown>;
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
  onBeforeSubmit,
  onReload,
  vehiclesBySegment,
}: ChangeVehiclesDialogProps) {
  const mutation = useChangeRoutePlanVehicles();
  const resetMutation = mutation.reset;
  const accountId = useAuthStore((state) => state.principal?.id);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const [snapshotSession, setSnapshotSession] = useState<{ accountId: string | undefined; sessionVersion: number; mode: ChangeVehiclesMode; incidentReportId?: string } | null>(null);
  const [snapshot, setSnapshot] = useState<ChangeVehiclesSnapshot | null>(null);
  const opened = useRef(false);
  const reloadRequested = useRef(false);
  const latest = useRef({ routePlan, segments });
  useEffect(() => { latest.current = { routePlan, segments }; }, [routePlan, segments]);
  const snapshotSegments = snapshot?.segments ?? [];
  const [selectedSegments, setSelectedSegments] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOptions>({});
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string[]>>({});
  const [reason, setReason] = useState("");
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState(false);
  const [result, setResult] = useState<ChangeRoutePlanVehiclesResult | null>(null);

  const copy = modeCopy[mode];
  const mappedError = mutation.error ? getChangeRoutePlanVehiclesError(mutation.error) : null;
  const missingIncident = mode === "mid-trip" && !incidentReportId;
  const changedSegments = changedVehicleSegments(snapshotSegments, selectedVehicles, selectedSegments);
  const selectedSegmentCount = changedSegments.length;
  const emptySelection = snapshotSegments.some((segment) => selectedSegments[segment.routePlanRouteId] && !selectedVehicles[segment.routePlanRouteId]?.length);
  const contextChanged = Boolean(snapshot && (snapshot.routePlan.routePlanId !== routePlan.routePlanId || snapshot.routePlan.transportPlanId !== routePlan.transportPlanId || snapshotSession?.accountId !== accountId || snapshotSession?.sessionVersion !== sessionVersion || snapshotSession?.mode !== mode || snapshotSession?.incidentReportId !== incidentReportId));
  const locked = mutation.isPending || reloading || Boolean(result) || contextChanged;
  const canSubmit = !locked && !missingIncident && !emptySelection && reason.trim().length > 0 && selectedSegmentCount > 0;

  useEffect(() => {
    if (!open) {
      opened.current = false;
      reloadRequested.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    setSnapshot(structuredClone({ routePlan, segments }));
    setSnapshotSession({ accountId, sessionVersion, mode, incidentReportId });
    setSelectedVehicles(Object.fromEntries(segments.map((segment) => [segment.routePlanRouteId, segment.vehicles.map((vehicle) => vehicle.vehicleId)])));
    setSelectedSegments({});
    setReason("");
    setResult(null);
    setNotice(null);
    resetMutation();
  }, [open, routePlan, segments, resetMutation, accountId, sessionVersion, mode, incidentReportId]);

  useEffect(() => {
    if (!open || !reloadRequested.current || !snapshot || routePlan.routePlanId !== snapshot.routePlan.routePlanId || routePlan.updatedAt === snapshot.routePlan.updatedAt) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      reloadRequested.current = false;
      setSnapshot(structuredClone({ routePlan, segments }));
      setNotice("Latest route version loaded. Your draft is preserved; review the assignments before applying.");
    });
    return () => { active = false; };
  }, [open, routePlan, segments, snapshot]);

  useEffect(() => {
    if (!open || !snapshot) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setIsLoadingVehicles(true);
      setVehicleOptions({});
      setVehicleLoadError(false);

      if (vehiclesBySegment) {
        setVehicleOptions(vehiclesBySegment);
        setIsLoadingVehicles(false);
        return;
      }

      await Promise.all(
        snapshot.segments.map(async (segment) => {
          const vehicles = await loadAllVehicles({
            availableFrom: dateOnly(segment.plannedDepartureAt),
            availableTo: dateOnly(segment.plannedArrivalAt),
            transportMode: segment.route.transportMode,
            transportPlanId: snapshot.routePlan.transportPlanId,
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
    });

    return () => {
      active = false;
    };
  }, [open, snapshot, vehiclesBySegment]);

  function toggleVehicle(segmentId: string, vehicleId: string, checked: boolean) {
    if (locked) return;
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
    if (locked) return;
    setSelectedSegments((current) => ({ ...current, [segmentId]: false }));
    const original = snapshotSegments.find((segment) => segment.routePlanRouteId === segmentId);
    setSelectedVehicles((current) => ({ ...current, [segmentId]: original?.vehicles.map((vehicle) => vehicle.vehicleId) ?? [] }));
  }

  function submit() {
    if (!canSubmit || !snapshot || isLoadingVehicles || vehicleLoadError) return;
    const auth = useAuthStore.getState();
    const accountId = auth.principal?.id;
    const sessionVersion = auth.sessionVersion;
    if (!auth.accessToken || !accountId || !snapshotSession || accountId !== snapshotSession.accountId || sessionVersion !== snapshotSession.sessionVersion) {
      setNotice("The account/session changed. Close and reopen this dialog before continuing.");
      return;
    }
    const isCurrent = () => {
      const current = useAuthStore.getState();
      return Boolean(current.accessToken) && current.principal?.id === accountId && current.sessionVersion === sessionVersion;
    };
    try {
      onBeforeSubmit?.(structuredClone({ ...snapshot, segments: changedSegments }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to prepare this change. Reload the route plan before trying again.");
      return;
    }
    if (!isCurrent()) return;
    mutation.mutate(
      {
        routePlanId: snapshot.routePlan.routePlanId,
        mode,
        payload: {
          lastUpdatedAt: snapshot.routePlan.updatedAt,
          reason: reason.trim(),
          ...(mode === "mid-trip" ? { incidentReportId } : {}),
          segments: changedSegments.flatMap((segment) => {
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
          if (!isCurrent()) return;
          setResult(result);
          try {
            void Promise.resolve(onChanged?.(result)).catch(() => {
              if (isCurrent()) setNotice("Vehicle changes were applied, but the workspace could not refresh. Reload to review the result.");
            });
          } catch {
            setNotice("Vehicle changes were applied, but the workspace could not refresh. Reload to review the result.");
          }
        },
      },
    );
  }

  async function reloadRoutePlan() {
    if (locked || !onReload || !snapshot) return;
    reloadRequested.current = true;
    setReloading(true);
    try {
      await onReload();
      if (latest.current.routePlan.routePlanId === snapshot.routePlan.routePlanId && latest.current.routePlan.updatedAt !== snapshot.routePlan.updatedAt) {
        reloadRequested.current = false;
        setSnapshot(structuredClone(latest.current));
      }
      setNotice("Reload requested. Your draft is preserved; review the latest assignments before applying.");
    } catch {
      reloadRequested.current = false;
      setNotice("Unable to reload the route plan. Your draft has been preserved.");
    } finally {
      setReloading(false);
    }
  }

  if (contextChanged) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen vehicle replacement</DialogTitle>
          <DialogDescription>The route, incident or account/session changed. Close this dialog and reopen it from the authorized workspace.</DialogDescription>
        </DialogHeader>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
      </DialogContent>
    </Dialog>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!mutation.isPending && !reloading) onOpenChange(value); }}>
      <DialogContent showCloseButton={!mutation.isPending && !reloading} className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[2px] border-slate-300 bg-slate-50 p-0 text-slate-950">
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
                {mappedError.shouldReload && onReload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-[2px] border-red-400 bg-white text-red-900 hover:bg-red-100"
                    disabled={locked}
                    onClick={() => void reloadRoutePlan()}
                  >
                    <RefreshCw className="mr-1.5 size-3.5" />
                    Reload route plan
                  </Button>
                )}
              </div>
            </div>
          )}

          {contextChanged && <p className="text-sm text-amber-800" role="alert">The route or account/session changed. Close and reopen this dialog before continuing.</p>}
          {(notice || mutation.refreshWarning) && <p className="text-sm text-amber-800" role="status">{notice ?? mutation.refreshWarning}</p>}
          {onReload && !result && !mappedError?.shouldReload && (
            <Button type="button" variant="outline" size="sm" disabled={locked} onClick={() => void reloadRoutePlan()}>
              <RefreshCw className="mr-1.5 size-3.5" />Reload route plan
            </Button>
          )}
          {emptySelection && <p className="text-sm text-red-700" role="alert">Select at least one vehicle for every selected segment, or mark that segment unchanged.</p>}

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
                  <ul className="m-0 mt-1 list-none space-y-1 p-0 text-xs">
                    {result.releasedVehicleIds.map((id) => <li key={id} className="break-all">{id}</li>)}
                  </ul>
                </div>
                <div className="rounded-[2px] border border-emerald-200 bg-white p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-800">Maintenance</span>
                  <span className="text-lg font-bold">{result.maintenanceVehicleIds.length}</span>
                  <ul className="m-0 mt-1 list-none space-y-1 p-0 text-xs">
                    {result.maintenanceVehicleIds.map((id) => <li key={id} className="break-all">{id}</li>)}
                  </ul>
                </div>
                <div className="rounded-[2px] border border-emerald-200 bg-white p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-800">Auto-applied segments</span>
                  <span className="text-lg font-bold">{result.appliedSegmentIds.length}</span>
                </div>
              </div>
            </div>
          )}

          {snapshotSegments.length === 0 ? (
            <div className="rounded-[2px] border border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-700">
              No segments are available for vehicle replacement.
            </div>
          ) : (
            <div className="grid gap-3">
              {snapshotSegments.map((segment) => {
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
                          {selectedSegments[segment.routePlanRouteId] ? "Selected" : "Unchanged"}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {segment.route.transportMode} · {segment.plannedDepartureAt} – {segment.plannedArrivalAt}
                      </p>
                    </CardHeader>
                    <CardContent className="grid gap-2 px-4 py-4">
                      <Label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={Boolean(selectedSegments[segment.routePlanRouteId])}
                          disabled={locked}
                          onCheckedChange={(checked) => {
                            if (checked === true) setSelectedSegments((current) => ({ ...current, [segment.routePlanRouteId]: true }));
                            else skipSegment(segment.routePlanRouteId);
                          }}
                        />
                        Change vehicles for this segment
                      </Label>
                      {segment.vehicles.filter(({ vehicleId }) => !options.some((vehicle) => vehicle.vehicleId === vehicleId)).map(({ vehicleId }) => (
                        <Label key={vehicleId} className="flex items-center gap-2 text-xs text-slate-600">
                          <Checkbox checked={selected.includes(vehicleId)} disabled={locked || !selectedSegments[segment.routePlanRouteId]} onCheckedChange={(checked) => toggleVehicle(segment.routePlanRouteId, vehicleId, checked === true)} />
                          Retain assigned vehicle {vehicleId} (not in available results)
                        </Label>
                      ))}
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
                                  disabled={locked || !selectedSegments[segment.routePlanRouteId]}
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
                      {selectedSegments[segment.routePlanRouteId] && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-fit rounded-[2px] px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                          onClick={() => skipSegment(segment.routePlanRouteId)}
                          disabled={locked}
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
              disabled={locked}
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
            <Button type="button" variant="outline" className="rounded-[2px] border-slate-400 bg-white text-slate-900 hover:bg-slate-100" disabled={mutation.isPending || reloading} onClick={() => onOpenChange(false)}>
              {result ? "CLOSE" : "CANCEL"}
            </Button>
            <Button
              type="button"
              className="rounded-[2px] bg-[#f39200] text-slate-950 hover:bg-[#d97f00]"
              disabled={!canSubmit || mutation.isPending || isLoadingVehicles || vehicleLoadError}
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
