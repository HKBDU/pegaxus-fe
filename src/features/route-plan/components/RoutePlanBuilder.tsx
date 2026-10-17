import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  MapViewer,
  type MapLocation,
  type MapMode,
  type MapRoute,
} from "@/shared/components/map";
import { PageHeader } from "@/shared/components/PageHeader";
import { ROLE_ROUTES } from "@/app/route-config";
import {
  previewGeoapifyRoute,
  snapToFeasibleRoadPoint,
} from "@/shared/utils/map/routing";
import {
  createRoutePlan,
  updateRoutePlan,
  getLocation,
  updateLocation,
} from "../services";
import { loadAllVehicles } from "../api-adapters";
import {
  buildEffectiveBackupRoute,
  validateRoutePlanRoute,
} from "../route-continuity";
import { calculateRouteTimeline } from "../timeline-calculator";
import type {
  CreateRoutePlanRequest,
  RouteSegmentInput,
  RoutePlanStatus,
  RouteType,
  Vehicle,
} from "../types";
import {
  arrangementForRoute,
  type DraftSegment,
  Metadata as BuilderMetadata,
  Progress as BuilderProgress,
  SegmentCard as BuilderSegmentCard,
  type RoutePlanBuilderMetadata,
  type WizardStep,
} from "./RoutePlanBuilderParts";
import { RoutePlanEndpointsStep } from "./RoutePlanEndpointsStep";
import { RoutePlanStatusBadge } from "./RoutePlanStatusBadge";

export type { RoutePlanBuilderMetadata } from "./RoutePlanBuilderParts";

type TransportPlanSummary = {
  transportPlanId: string;
  planCode: string;
  bookingCode: string;
  routeType: RouteType;
  status: RoutePlanStatus;
  scope: "International" | "Domestic";
  departureAt: string;
  arrivalAt: string;
  from: MapLocation;
  to: MapLocation;
};

type RoutePlanRouteFilter = "ALL" | RouteType;

export type RoutePlanBuilderProps = {
  transportPlanId: string;
  routeType?: RouteType;
  primaryRoutes?: MapRoute[];
  backupRoutes?: MapRoute[];
  routePlanRoutes?: MapRoute[];
  primaryAvailable?: boolean;
  primaryError?: string;
  metadata?: RoutePlanBuilderMetadata;
  initialRoutes?: MapRoute[];
  initialRouteNote?: string;
  locations: MapLocation[];
  routes: MapRoute[];
  vehicles?: Vehicle[];
  edit?: { routePlanId: string; lastUpdatedAt: string };
};

export function RoutePlanBuilder({
  transportPlanId,
  routeType = "PRIMARY",
  primaryRoutes,
  backupRoutes,
  routePlanRoutes,
  primaryAvailable = true,
  primaryError,
  metadata,
  initialRoutes = [],
  initialRouteNote = "",
  locations: initialLocations,
  routes,
  vehicles: initialVehicles,
  edit,
}: RoutePlanBuilderProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [, setMode] = useState<MapMode>("buildPlan");
  const [locations, setLocations] = useState<MapLocation[]>(initialLocations);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>(
    initialVehicles ?? [],
  );

  async function persistFeasibleLocation(
    loc: MapLocation,
    snapped: { latitude: number; longitude: number },
  ) {
    try {
      const locId = String(loc.id);
      if (!locId || locId.startsWith("unknown") || locId.startsWith("dynamic")) return;
      const current = await getLocation(locId);
      if (!current) return;
      const latDiff = Math.abs((current.latitude ?? 0) - snapped.latitude);
      const lonDiff = Math.abs((current.longitude ?? 0) - snapped.longitude);
      if (latDiff < 0.0001 && lonDiff < 0.0001) return;

      await updateLocation(locId, {
        locationName: current.locationName,
        locationType: current.locationType,
        address: current.address,
        city: current.city,
        stateProvince: current.stateProvince,
        country: current.country,
        latitude: snapped.latitude,
        longitude: snapped.longitude,
        locationNote: current.locationNote,
        lastUpdatedAt: current.updatedAt,
      });

      setLocations((currentLocations) =>
        currentLocations.map((item) =>
          String(item.id) === locId
            ? { ...item, latitude: snapped.latitude, longitude: snapped.longitude }
            : item,
        ),
      );
    } catch (err) {
      console.warn("Could not persist feasible location coordinate:", err);
    }
  }

  async function checkAndPersistLocation(loc: MapLocation) {
    if (!loc || !loc.latitude || !loc.longitude) return;
    const snapResult = await snapToFeasibleRoadPoint({
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    if (snapResult.isSnapped) {
      await persistFeasibleLocation(loc, snapResult);
    }
  }

  const [customFrom, setCustomFrom] = useState<MapLocation | null>(null);
  const [customTo, setCustomTo] = useState<MapLocation | null>(null);

  const isBackup = routeType === "BACKUP";
  const isReturn = routeType === "RETURN";
  const readonlyPrimaryRoutes = useMemo(
    () => primaryRoutes ?? [],
    [primaryRoutes],
  );

  const [returnOrigin, setReturnOrigin] = useState<MapLocation | null>(
    () => initialRoutes[0]?.fromLocation ?? null,
  );

  const fallbackFrom =
    customFrom ??
    (isReturn ? returnOrigin : null) ??
    readonlyPrimaryRoutes[0]?.fromLocation ??
    initialRoutes[0]?.fromLocation ??
    metadata?.from;
  const fallbackTo =
    customTo ??
    readonlyPrimaryRoutes.at(-1)?.toLocation ??
    initialRoutes.at(-1)?.toLocation ??
    metadata?.to ??
    fallbackFrom;
  const planFrom = (isReturn ? fallbackFrom : (metadata?.from ?? fallbackFrom))!;
  const planTo = (isReturn ? (metadata?.from ?? fallbackTo) : (metadata?.to ?? fallbackTo))!;

  const plan: TransportPlanSummary = useMemo(
    () => ({
      ...metadata,
      planCode: metadata?.planCode ?? "—",
      bookingCode: metadata?.bookingCode ?? "—",
      status: metadata?.status ?? "DRAFT",
      scope: metadata?.scope ?? "Domestic",
      departureAt: metadata?.departureAt ?? "",
      arrivalAt: metadata?.arrivalAt ?? "",
      from: planFrom,
      to: planTo,
      transportPlanId,
      routeType,
    }),
    [planFrom, planTo, metadata, routeType, transportPlanId],
  );

  // Helper to recompute timeline & check segment continuity
  function formatDraftSegments(
    rawSegments: DraftSegment[],
    baseStart?: string,
  ): DraftSegment[] {
    const startTime = baseStart || plan.departureAt || new Date().toISOString();
    let timedSegments: DraftSegment[];
    try {
      timedSegments = calculateRouteTimeline(startTime, rawSegments);
    } catch {
      timedSegments = rawSegments;
    }

    return timedSegments.map((seg, index) => {
      const isDisconnected =
        index > 0 &&
        String(seg.route.fromLocation?.id) !==
          String(timedSegments[index - 1]?.route.toLocation?.id);
      return {
        ...seg,
        sequenceNo: index + 1,
        isDisconnected,
      };
    });
  }

  const [segments, setSegments] = useState<DraftSegment[]>(() =>
    formatDraftSegments(
      initialRoutes.map((route, index) => ({
        id: `${route.id}-${index}`,
        route,
        arrangement: arrangementForRoute(route),
        stopType:
          route.toLocation?.id === metadata?.to?.id
            ? "DESTINATION"
            : route.toLocation?.type === "BORDER_GATE"
              ? "BCP"
              : "REST_STOP",
        dwellAfterMinutes: 0,
      })),
      metadata?.departureAt,
    ),
  );

  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [routeNote, setRouteNote] = useState(initialRouteNote);
  const [updateReason, setUpdateReason] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [routePlanTypeFilter, setRoutePlanTypeFilter] =
    useState<RoutePlanRouteFilter>("ALL");
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [sourceLocation, setSourceLocation] = useState<MapLocation | null>(null);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | null>(null);

  // Load available vehicles if not passed from props
  useEffect(() => {
    if (initialVehicles?.length) {
      setAvailableVehicles(initialVehicles);
      return;
    }
    void loadAllVehicles()
      .then((items) => {
        setAvailableVehicles(items.filter((v) => v.status === "AVAILABLE"));
      })
      .catch(() => {});
  }, [initialVehicles]);

  const routeCatalog = useMemo(
    () =>
      [
        ...(isBackup ? (backupRoutes ?? routes) : routes),
        ...(isReturn ? (routePlanRoutes ?? []) : []),
        ...initialRoutes,
      ].filter(
        (route, index, routes) =>
          routes.findIndex((item) => item.id === route.id) === index,
      ),
    [backupRoutes, initialRoutes, isBackup, isReturn, routePlanRoutes, routes],
  );

  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return routeCatalog.filter(
      (route) =>
        (routePlanTypeFilter === "ALL" ||
          route.routePlanType === routePlanTypeFilter) &&
        [
          route.name,
          route.fromLocation?.name,
          route.toLocation?.name,
          route.transportMode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [routeCatalog, routePlanTypeFilter, routeSearch]);

  const locationOptions = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((location) =>
      [location.name, location.address, location.city, location.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [locationSearch, locations]);

  const selectedRoutes = useMemo(
    () =>
      isBackup
        ? [
            ...readonlyPrimaryRoutes.map((route) => ({
              ...route,
              readonly: true,
            })),
            ...segments.map((segment) => segment.route),
          ]
        : segments.map((segment) => segment.route),
    [isBackup, readonlyPrimaryRoutes, segments],
  );

  const continuity = useMemo(() => {
    const fromId = plan.from?.id ?? "";
    const toId = plan.to?.id ?? "";
    if (!fromId || !toId) {
      return {
        valid: false,
        message: "Transport Plan origin or destination location is not resolved.",
        effectiveRoutes: [],
      };
    }
    return isBackup
      ? buildEffectiveBackupRoute(
          readonlyPrimaryRoutes,
          segments.map((segment) => segment.route),
          fromId,
          toId,
        )
      : validateRoutePlanRoute(
          segments.map((segment) => segment.route),
          fromId,
          toId,
        );
  }, [isBackup, plan.from?.id, plan.to?.id, readonlyPrimaryRoutes, segments]);

  function addSegment(route: MapRoute, insertIndex?: number) {
    if (route.readonly) {
      setBuildMessage("Primary segments are view-only. Select a backup route to add it.");
      return;
    }
    setBuildMessage(null);
    const newSegment: DraftSegment = {
      id: `${route.id}-${Date.now()}`,
      route,
      arrangement: arrangementForRoute(route),
      stopType:
        route.toLocation?.id === plan.to?.id
          ? "DESTINATION"
          : route.toLocation?.type === "BORDER_GATE"
            ? "BCP"
            : "REST_STOP",
      dwellAfterMinutes: 0,
    };

    setSegments((current) => {
      const updated = [...current];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex < updated.length) {
        updated.splice(insertIndex + 1, 0, newSegment);
      } else {
        updated.push(newSegment);
      }
      return formatDraftSegments(updated, plan.departureAt);
    });
  }

  function moveSegment(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= segments.length) return;
    setSegments((current) => {
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return formatDraftSegments(updated, plan.departureAt);
    });
  }

  function deleteSegment(index: number) {
    setSegments((current) => {
      const updated = current.filter((_, idx) => idx !== index);
      return formatDraftSegments(updated, plan.departureAt);
    });
  }

  function handleDwellChange(index: number, minutes: number) {
    setSegments((current) => {
      const updated = current.map((seg, idx) =>
        idx === index ? { ...seg, dwellAfterMinutes: minutes } : seg,
      );
      return formatDraftSegments(updated, plan.departureAt);
    });
  }

  function handleVehicleChange(index: number, vehicleIds: string[]) {
    setSegments((current) =>
      current.map((seg, idx) => (idx === index ? { ...seg, vehicleIds } : seg)),
    );
  }

  async function selectMapLocation(location: MapLocation) {
    if (isReturn) {
      setReturnOrigin(location);
      setBuildMessage(`Return origin selected: ${location.name}.`);
      return;
    }
    if (!sourceLocation) {
      setSourceLocation(location);
      setBuildMessage(`Source selected: ${location.name}. Please choose a destination.`);
      return;
    }
    if (String(sourceLocation.id) === String(location.id)) {
      setBuildMessage("Source and destination must be different.");
      return;
    }

    const found = routeCatalog.find(
      (route) =>
        String(route.fromLocation?.id) === String(sourceLocation.id) &&
        String(route.toLocation?.id) === String(location.id),
    );

    if (found) {
      addSegment(found);
      toast.success(`${sourceLocation.name} → ${location.name}`, {
        description: "Saved route added.",
      });
    } else {
      // Dynamic Geoapify route calculation
      const loadingToast = toast.loading(
        `Calculating route: ${sourceLocation.name} → ${location.name}...`,
      );
      try {
        const preview = await previewGeoapifyRoute(
          { latitude: sourceLocation.latitude, longitude: sourceLocation.longitude },
          { latitude: location.latitude, longitude: location.longitude },
        );
        let actualFrom = sourceLocation;
        let actualTo = location;
        if (preview.snappedStart) {
          actualFrom = { ...sourceLocation, ...preview.snappedStart };
          void persistFeasibleLocation(sourceLocation, preview.snappedStart);
        }
        if (preview.snappedEnd) {
          actualTo = { ...location, ...preview.snappedEnd };
          void persistFeasibleLocation(location, preview.snappedEnd);
        }
        const dynamicRoute: MapRoute = {
          id: `dynamic-${sourceLocation.id}-${location.id}`,
          name: `${sourceLocation.name} → ${location.name} (Calculated)`,
          fromLocation: actualFrom,
          toLocation: actualTo,
          distanceKm: Math.round(preview.distanceKm * 10) / 10,
          durationMinutes: Math.round(preview.durationMinutes),
          transportMode: "ROAD",
          geometry: preview.geometry,
        };
        addSegment(dynamicRoute);
        toast.success(`${sourceLocation.name} → ${location.name}`, {
          id: loadingToast,
          description: `Route calculated: ${dynamicRoute.distanceKm} km (${Math.round(dynamicRoute.durationMinutes ?? 0)} mins).`,
        });
      } catch (err) {
        toast.error(`Unable to calculate route: ${sourceLocation.name} → ${location.name}`, {
          id: loadingToast,
          description: err instanceof Error ? err.message : "Route calculation failed.",
        });
      }
    }
    setSourceLocation(null);
  }

  function toPayload(
    action: CreateRoutePlanRequest["action"],
  ): CreateRoutePlanRequest {
    const payloadRoutes = isBackup
      ? [
          ...readonlyPrimaryRoutes.map((route) => ({
            route,
            routeType: "PRIMARY" as const,
            plannedDepartureAt: plan.departureAt,
            plannedArrivalAt: plan.arrivalAt,
            vehicleIds: undefined,
            outsourcing: undefined,
          })),
          ...segments.map((segment) => ({
            route: segment.route,
            routeType: "BACKUP" as const,
            plannedDepartureAt: segment.plannedDepartureAt || plan.departureAt,
            plannedArrivalAt: segment.plannedArrivalAt || plan.arrivalAt,
            vehicleIds: segment.vehicleIds,
            outsourcing:
              segment.arrangement === "OUTSOURCED" && segment.provider
                ? {
                    transportProviderId: segment.provider.transportProviderId,
                    note: segment.note,
                  }
                : undefined,
          })),
        ]
      : segments.map((segment) => ({
          route: segment.route,
          routeType,
          plannedDepartureAt: segment.plannedDepartureAt || plan.departureAt,
          plannedArrivalAt: segment.plannedArrivalAt || plan.arrivalAt,
          vehicleIds: segment.vehicleIds,
          outsourcing:
            segment.arrangement === "OUTSOURCED" && segment.provider
              ? {
                  transportProviderId: segment.provider.transportProviderId,
                  note: segment.note,
                }
              : undefined,
        }));

    return {
      routeType: plan.routeType,
      action,
      ...(isBackup || isReturn ? { routeNote: routeNote.trim() } : {}),
      segments: payloadRoutes.map(
        ({ route, routeType: segmentRouteType, plannedDepartureAt, plannedArrivalAt, vehicleIds, outsourcing }, index): RouteSegmentInput => ({
          sequenceNo: index + 1,
          ...(isBackup || isReturn ? { routeType: segmentRouteType } : {}),
          routeId: String(route.id).startsWith("dynamic-") ? undefined : String(route.id),
          fromLocationId: String(route.fromLocation?.id),
          toLocationId: String(route.toLocation?.id),
          transportMode: route.transportMode ?? "ROAD",
          plannedDepartureAt,
          plannedArrivalAt,
          ...(outsourcing
            ? { outsourcing }
            : vehicleIds?.length
              ? { vehicleIds }
              : {}),
        }),
      ),
    };
  }

  async function save(action: CreateRoutePlanRequest["action"]) {
    setSaveError(null);
    setSaveNotice(null);
    if (!segments.length) {
      setSaveError("Add at least one segment before saving.");
      return;
    }
    if (!continuity.valid) {
      setSaveError(continuity.message ?? "Route segments are not continuous.");
      return;
    }
    if (isBackup && !primaryAvailable) {
      setSaveError(
        "A valid PRIMARY route plan is required before creating a backup route.",
      );
      return;
    }
    if ((isBackup || isReturn) && routeNote.trim().length < 10) {
      setSaveError("Backup reason must be at least 10 characters.");
      return;
    }
    if (edit && !updateReason.trim()) {
      setSaveError("Update reason is required.");
      return;
    }
    try {
      // Pre-save check: ensure all locations in segments have feasible road coordinates in the backend
      for (const seg of segments) {
        if (seg.route.fromLocation) {
          await checkAndPersistLocation(seg.route.fromLocation);
        }
        if (seg.route.toLocation) {
          await checkAndPersistLocation(seg.route.toLocation);
        }
      }

      if (edit) {
        await updateRoutePlan(edit.routePlanId, {
          lastUpdatedAt: edit.lastUpdatedAt,
          updateReason: updateReason.trim(),
          routeNote: routeNote.trim() || undefined,
          action,
          segments: toPayload(action).segments,
        });
      } else {
        await createRoutePlan(transportPlanId, toPayload(action));
      }
      setSaveNotice(
        action === "SAVE_DRAFT"
          ? "Draft saved successfully."
          : "Submitted for legal review.",
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save route plan.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 md:p-4">
      <div className="mx-auto grid max-w-[1440px] gap-3">
        <PageHeader
          title={
            isReturn
              ? "CREATE RETURN ROUTE"
              : isBackup
                ? "CREATE CONTINGENCY ROUTE"
                : edit
                  ? "EDIT ROUTE PLAN"
                  : "CREATE ROUTE PLAN"
          }
          backHref={ROLE_ROUTES.routePlans}
          backLabel="BACK TO ROUTE PLANS"
          action={<RoutePlanStatusBadge status={plan.status} />}
        />
        <BuilderMetadata plan={plan} />
        <BuilderProgress step={step} onChange={setStep} />
        <section className="rounded-b-[2px] bg-white p-3 md:p-4">
          {step === 0 && (
            <RoutePlanEndpointsStep
              from={plan.from}
              to={plan.to}
              returnMode={isReturn}
              locations={locations}
              onFromChange={(loc) => {
                setCustomFrom(loc);
                void checkAndPersistLocation(loc);
              }}
              onToChange={(loc) => {
                setCustomTo(loc);
                void checkAndPersistLocation(loc);
              }}
              isFromResolved={metadata?.isFromResolved ?? true}
              isToResolved={metadata?.isToResolved ?? true}
              unresolvedOriginAddress={metadata?.unresolvedOriginAddress}
              unresolvedDestinationAddress={metadata?.unresolvedDestinationAddress}
            />
          )}

          {step === 1 && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">Route Map</h2>
                    {sourceLocation && (
                      <Badge className="rounded-[2px] bg-amber-500 text-white">
                        From: {sourceLocation.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="rounded-[2px]">
                    {isReturn
                      ? "Build return mode"
                      : isBackup
                        ? "Build backup mode"
                        : "Build mode"}
                  </Badge>
                </div>
                {isBackup && !primaryAvailable && (
                  <div className="mb-2 rounded-[2px] border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                    {primaryError ??
                      "Primary route plan not found. Please create a primary route plan first."}
                  </div>
                )}
                <MapViewer
                  locations={locations}
                  routes={selectedRoutes}
                  mode="buildPlan"
                  onModeChange={setMode}
                  showSearch
                  searchOptions={locationOptions}
                  onSearchChange={setLocationSearch}
                  onMarkerSelect={selectMapLocation}
                  onRouteSelect={() => undefined}
                  buildStartLocation={plan.from}
                  buildEndLocation={plan.to}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Route Segments Builder</h2>
                  <span className="text-sm text-muted-foreground">
                    {segments.length}{" "}
                    {isReturn ? "return " : isBackup ? "backup " : ""}segment(s)
                  </span>
                </div>

                <div className="grid gap-2">
                  {/* Inline Insert Destination Helper Modal/Dropdown */}
                  {insertTargetIndex !== null && (
                    <div className="rounded-[2px] border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Insert Intermediate Stop after Segment {insertTargetIndex + 1}:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground hover:bg-amber-100/60 rounded-[2px]"
                          onClick={() => setInsertTargetIndex(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <select
                        className="mt-1.5 h-8 w-full rounded-[2px] border border-slate-200 bg-white px-2 text-xs font-normal text-slate-900 focus:border-amber-500 focus:outline-none"
                        onChange={async (e) => {
                          const stopLoc = locations.find((l) => String(l.id) === e.target.value);
                          if (!stopLoc || insertTargetIndex === null) return;
                          const currentSeg = segments[insertTargetIndex];
                          if (!currentSeg) return;

                          const fromLoc = currentSeg.route.fromLocation;
                          if (!fromLoc) return;
                          try {
                            const preview = await previewGeoapifyRoute(
                              { latitude: fromLoc.latitude, longitude: fromLoc.longitude },
                              { latitude: stopLoc.latitude, longitude: stopLoc.longitude },
                            );
                            let actualFrom = fromLoc;
                            let actualStop = stopLoc;
                            if (preview.snappedStart) {
                              actualFrom = { ...fromLoc, ...preview.snappedStart };
                              void persistFeasibleLocation(fromLoc, preview.snappedStart);
                            }
                            if (preview.snappedEnd) {
                              actualStop = { ...stopLoc, ...preview.snappedEnd };
                              void persistFeasibleLocation(stopLoc, preview.snappedEnd);
                            }
                            const newRoute: MapRoute = {
                              id: `dynamic-${fromLoc.id}-${stopLoc.id}`,
                              name: `${fromLoc.name} → ${stopLoc.name} (Inserted)`,
                              fromLocation: actualFrom,
                              toLocation: actualStop,
                              distanceKm: Math.round(preview.distanceKm * 10) / 10,
                              durationMinutes: Math.round(preview.durationMinutes),
                              transportMode: "ROAD",
                              geometry: preview.geometry,
                            };
                            addSegment(newRoute, insertTargetIndex);
                            setInsertTargetIndex(null);
                          } catch {
                            toast.error("Unable to calculate route for inserted stop.");
                          }
                        }}
                      >
                        <option value="">Select location to insert...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={String(loc.id)}>
                            {loc.name} — {loc.city}, {loc.country}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {segments.map((segment, index) => (
                    <BuilderSegmentCard
                      key={segment.id}
                      segment={segment}
                      index={index}
                      totalSegments={segments.length}
                      onDelete={() => deleteSegment(index)}
                      onMoveUp={() => moveSegment(index, index - 1)}
                      onMoveDown={() => moveSegment(index, index + 1)}
                      onInsertStop={() => setInsertTargetIndex(index)}
                      onDwellChange={(mins) => handleDwellChange(index, mins)}
                      onVehicleChange={(vIds) => handleVehicleChange(index, vIds)}
                      availableVehicles={availableVehicles}
                      routePlanId={edit?.routePlanId}
                      onOutsource={(selection) =>
                        setSegments((items) =>
                          items.map((item) =>
                            item.id === segment.id
                              ? {
                                  ...item,
                                  arrangement: selection ? "OUTSOURCED" : "INTERNAL",
                                  provider: selection?.provider,
                                  note: selection?.note,
                                  vehicleIds: selection ? undefined : item.vehicleIds,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit rounded-[2px] text-xs font-medium"
                    onClick={() => setShowRouteSearch((value) => !value)}
                  >
                    {showRouteSearch ? "Close Route Search" : "+ Add Segment"}
                  </Button>

                  {showRouteSearch && (
                    <div className="rounded-[2px] border border-slate-200 bg-slate-50 p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          value={routeSearch}
                          onChange={(event) => setRouteSearch(event.target.value)}
                          placeholder="Search saved route or location..."
                          className="h-9 w-full rounded-[2px] border border-slate-200 bg-white px-3 text-xs font-normal"
                        />
                        <select
                          value={routePlanTypeFilter}
                          onChange={(event) =>
                            setRoutePlanTypeFilter(
                              event.target.value as RoutePlanRouteFilter,
                            )
                          }
                          className="h-9 rounded-[2px] border border-slate-200 bg-white px-3 text-xs font-normal"
                          aria-label="Filter route plan type"
                        >
                          <option value="ALL">All Route Plan Types</option>
                          <option value="PRIMARY">PRIMARY</option>
                          <option value="BACKUP">BACKUP</option>
                          <option value="RETURN">RETURN</option>
                        </select>
                      </div>

                      <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
                        {filteredRoutes.map((route) => (
                          <button
                            key={route.id}
                            type="button"
                            className="rounded-[2px] border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-amber-500 hover:bg-amber-50/50"
                            onClick={() => {
                              addSegment(route);
                              setShowRouteSearch(false);
                            }}
                          >
                            <span className="block font-semibold text-slate-900">
                              {route.name ?? "Unnamed Route"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {route.fromLocation?.name} → {route.toLocation?.name} ·{" "}
                              {route.transportMode ?? "ROAD"}
                            </span>
                          </button>
                        ))}
                        {!filteredRoutes.length && (
                          <p className="text-xs text-muted-foreground">
                            No saved route found. You can also click 2 locations directly on the map.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {buildMessage && (
                    <p className="text-xs text-amber-700 font-medium">{buildMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Route Map</h2>
                  <Badge variant="outline" className="rounded-[2px]">View mode</Badge>
                </div>
                <MapViewer
                  locations={locations}
                  routes={selectedRoutes}
                  mode="view"
                />
              </div>

              <div className="grid content-start gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Review</h2>
                <Card className="rounded-[2px]">
                  <CardContent className="grid gap-3 py-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total segments</span>
                      <b>{segments.length}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Arrangement</span>
                      <b>
                        {
                          segments.filter(
                            (segment) => segment.arrangement === "OUTSOURCED",
                          ).length
                        }{" "}
                        outsourced,{" "}
                        {
                          segments.filter(
                            (segment) => segment.arrangement === "INTERNAL",
                          ).length
                        }{" "}
                        internal
                      </b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route type</span>
                      <b>{plan.routeType}</b>
                    </div>
                  </CardContent>
                </Card>

                {(isBackup || isReturn) && (
                  <label className="grid gap-2 text-sm font-medium text-slate-900">
                    {isReturn ? "Return reason" : "Backup reason"}
                    <span className="font-normal text-muted-foreground text-xs">
                      Minimum 10 characters
                    </span>
                    <textarea
                      className="min-h-20 rounded-[2px] border border-slate-200 p-2 text-xs font-normal text-slate-900 focus:border-amber-500 focus:outline-none"
                      value={routeNote}
                      onChange={(event) => setRouteNote(event.target.value)}
                      placeholder="Why is this route needed?"
                    />
                  </label>
                )}

                {edit && (
                  <label className="grid gap-2 text-sm font-medium text-slate-900">
                    Update reason
                    <textarea
                      aria-label="Update reason"
                      className="min-h-20 rounded-[2px] border border-slate-200 p-2 text-xs font-normal text-slate-900 focus:border-amber-500 focus:outline-none"
                      value={updateReason}
                      onChange={(event) => setUpdateReason(event.target.value)}
                      placeholder="Why is this route plan being updated?"
                    />
                  </label>
                )}

                {saveError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-[2px]">
                    {saveError}
                  </p>
                )}
                {saveNotice && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-[2px]">
                    {saveNotice}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-[2px]"
                    onClick={() => void save("SAVE_DRAFT")}
                  >
                    Save Draft
                  </Button>
                  {!isReturn && (
                    <Button
                      variant="outline"
                      className="rounded-[2px]"
                      onClick={() => void save("SUBMIT_FOR_LEGAL_REVIEW")}
                    >
                      Submit for legal review
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-between">
          <Button
            variant="outline"
            className="rounded-[2px]"
            disabled={step === 0}
            onClick={() =>
              setStep((value) => Math.max(0, value - 1) as WizardStep)
            }
          >
            <ArrowLeft className="mr-1 size-4" /> Back
          </Button>
          <Button
            className="rounded-[2px]"
            disabled={
              step === 2 ||
              (step === 1 &&
                (!segments.length ||
                  !continuity.valid ||
                  (isBackup && !primaryAvailable) ||
                  (isReturn && !returnOrigin)))
            }
            onClick={() =>
              setStep((value) => Math.min(2, value + 1) as WizardStep)
            }
          >
            Next <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
