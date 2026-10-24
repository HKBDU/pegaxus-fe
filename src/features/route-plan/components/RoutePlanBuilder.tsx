import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
  createLocation,
  getLocation,
  updateLocation,
  getRoutePlanError,
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
import { BcpRouteSplitDialog } from "./BcpRouteSplitDialog";
import {
  findBestBcpAlongRoute,
  isCrossBorder as checkIsCrossBorder,
  isBcpLocation,
} from "../bcp-detector";

export type { RoutePlanBuilderMetadata } from "./RoutePlanBuilderParts";

export type BcpSplitProposal = {
  routeToSplit: MapRoute;
  targetSegmentIndex?: number;
  detectedBcp: MapLocation;
  distanceKmToRoute: number;
  isMandatory: boolean;
};

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
            : isBcpLocation(route.toLocation)
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
    void loadAllVehicles({
      availableFrom: plan.departureAt,
      availableTo: plan.arrivalAt,
      transportPlanId,
    })
      .then((items) => {
        setAvailableVehicles(items.filter((v) => v.status === "AVAILABLE"));
      })
      .catch(() => {});
  }, [initialVehicles, plan.departureAt, plan.arrivalAt, transportPlanId]);

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

  const isCrossBorder = useMemo(() => {
    if (plan.scope === "International") return true;
    const fromCountry = plan.from?.country?.trim().toLowerCase();
    const toCountry = plan.to?.country?.trim().toLowerCase();
    if (fromCountry && toCountry && fromCountry !== toCountry) return true;
    const routesToCheck = isBackup
      ? (continuity.effectiveRoutes.length > 0
          ? continuity.effectiveRoutes
          : [...readonlyPrimaryRoutes, ...segments.map((s) => s.route)])
      : segments.map((s) => s.route);
    return routesToCheck.some((s) => {
      const fc = s.fromLocation?.country?.trim().toLowerCase();
      const tc = s.toLocation?.country?.trim().toLowerCase();
      return fc && tc && fc !== tc;
    });
  }, [plan.scope, plan.from?.country, plan.to?.country, isBackup, continuity.effectiveRoutes, readonlyPrimaryRoutes, segments]);

  const hasBcp = useMemo(() => {
    const hasInSegments = segments.some(
      (s) =>
        s.stopType === "BCP" ||
        isBcpLocation(s.route.toLocation) ||
        isBcpLocation(s.route.fromLocation),
    );
    if (hasInSegments) return true;
    if (isBackup) {
      if (continuity.effectiveRoutes.length > 0) {
        return continuity.effectiveRoutes.some(
          (r) => isBcpLocation(r.fromLocation) || isBcpLocation(r.toLocation),
        );
      }
      return readonlyPrimaryRoutes.some(
        (r) => isBcpLocation(r.fromLocation) || isBcpLocation(r.toLocation),
      );
    }
    return false;
  }, [segments, isBackup, continuity.effectiveRoutes, readonlyPrimaryRoutes]);

  const bcpLocations = useMemo(() => {
    return locations.filter(isBcpLocation);
  }, [locations]);

  const [isBcpDismissed, setIsBcpDismissed] = useState(false);
  const [showNewBcpForm, setShowNewBcpForm] = useState(false);
  const [selectedBcpId, setSelectedBcpId] = useState("");
  const [splitSegmentIndex, setSplitSegmentIndex] = useState(0);

  // New BCP form fields
  const [newBcpName, setNewBcpName] = useState("");
  const [newBcpCountry, setNewBcpCountry] = useState("");
  const [newBcpCity, setNewBcpCity] = useState("");
  const [newBcpAddress, setNewBcpAddress] = useState("");
  const [newBcpLat, setNewBcpLat] = useState("");
  const [newBcpLon, setNewBcpLon] = useState("");
  const [creatingBcp, setCreatingBcp] = useState(false);

  const [bcpSplitProposal, setBcpSplitProposal] = useState<BcpSplitProposal | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);

  const reversedSegments = useMemo(() => {
    return segments
      .map((segment, index) => ({ segment, index }))
      .reverse();
  }, [segments]);

  async function insertBcpIntoRoute(bcpLoc: MapLocation, targetSegIndex = 0) {
    if (!segments.length) {
      const fromLoc = plan.from;
      if (!fromLoc) return;
      const toastId = toast.loading(`Routing to BCP: ${bcpLoc.name}...`);
      try {
        const preview = await previewGeoapifyRoute(
          { latitude: fromLoc.latitude, longitude: fromLoc.longitude },
          { latitude: bcpLoc.latitude, longitude: bcpLoc.longitude },
        );
        let actualFrom = fromLoc;
        let actualBcp = bcpLoc;
        if (preview.snappedStart) {
          actualFrom = { ...fromLoc, ...preview.snappedStart };
          void persistFeasibleLocation(fromLoc, preview.snappedStart);
        }
        if (preview.snappedEnd) {
          actualBcp = { ...bcpLoc, ...preview.snappedEnd };
          void persistFeasibleLocation(bcpLoc, preview.snappedEnd);
        }
        const dynamicRoute: MapRoute = {
          id: `dynamic-${fromLoc.id}-${bcpLoc.id}`,
          name: `${fromLoc.name} → ${bcpLoc.name}`,
          fromLocation: actualFrom,
          toLocation: actualBcp,
          distanceKm: Math.round(preview.distanceKm * 10) / 10,
          durationMinutes: Math.round(preview.durationMinutes),
          transportMode: "ROAD",
          geometry: preview.geometry,
        };
        addSegment(dynamicRoute);
        toast.success(`BCP "${bcpLoc.name}" added.`, { id: toastId });
      } catch (err) {
        toast.error("Failed to route to BCP", {
          id: toastId,
          description: err instanceof Error ? err.message : "Route calculation error",
        });
      }
      return;
    }

    const safeIndex = Math.min(Math.max(0, targetSegIndex), segments.length - 1);
    const segToSplit = segments[safeIndex];
    if (!segToSplit) return;

    const originLoc = segToSplit.route.fromLocation ?? plan.from;
    const destLoc = segToSplit.route.toLocation ?? plan.to;
    if (!originLoc || !destLoc) return;

    const toastId = toast.loading(`Routing through BCP: ${bcpLoc.name}...`);
    try {
      const preview1 = await previewGeoapifyRoute(
        { latitude: originLoc.latitude, longitude: originLoc.longitude },
        { latitude: bcpLoc.latitude, longitude: bcpLoc.longitude },
      );
      let actualOrigin = originLoc;
      let actualBcp1 = bcpLoc;
      if (preview1.snappedStart) {
        actualOrigin = { ...originLoc, ...preview1.snappedStart };
        void persistFeasibleLocation(originLoc, preview1.snappedStart);
      }
      if (preview1.snappedEnd) {
        actualBcp1 = { ...bcpLoc, ...preview1.snappedEnd };
        void persistFeasibleLocation(bcpLoc, preview1.snappedEnd);
      }

      const preview2 = await previewGeoapifyRoute(
        { latitude: actualBcp1.latitude, longitude: actualBcp1.longitude },
        { latitude: destLoc.latitude, longitude: destLoc.longitude },
      );
      let actualDest = destLoc;
      if (preview2.snappedEnd) {
        actualDest = { ...destLoc, ...preview2.snappedEnd };
        void persistFeasibleLocation(destLoc, preview2.snappedEnd);
      }

      const route1: MapRoute = {
        id: `dynamic-${originLoc.id}-${bcpLoc.id}-${Date.now()}`,
        name: `${originLoc.name} → ${bcpLoc.name}`,
        fromLocation: actualOrigin,
        toLocation: actualBcp1,
        distanceKm: Math.round(preview1.distanceKm * 10) / 10,
        durationMinutes: Math.round(preview1.durationMinutes),
        transportMode: "ROAD",
        geometry: preview1.geometry,
      };

      const route2: MapRoute = {
        id: `dynamic-${bcpLoc.id}-${destLoc.id}-${Date.now() + 1}`,
        name: `${bcpLoc.name} → ${destLoc.name}`,
        fromLocation: actualBcp1,
        toLocation: actualDest,
        distanceKm: Math.round(preview2.distanceKm * 10) / 10,
        durationMinutes: Math.round(preview2.durationMinutes),
        transportMode: "ROAD",
        geometry: preview2.geometry,
      };

      const seg1: DraftSegment = {
        id: `seg-${Date.now()}-1`,
        route: route1,
        arrangement: arrangementForRoute(route1),
        stopType: "BCP",
        dwellAfterMinutes: 30,
      };

      const seg2: DraftSegment = {
        id: `seg-${Date.now()}-2`,
        route: route2,
        arrangement: arrangementForRoute(route2),
        stopType: segToSplit.stopType === "BCP" ? "REST_STOP" : segToSplit.stopType,
        dwellAfterMinutes: segToSplit.dwellAfterMinutes ?? 0,
        vehicleIds: segToSplit.vehicleIds,
      };

      setSegments((current) => {
        const updated = [...current];
        updated.splice(safeIndex, 1, seg1, seg2);
        return formatDraftSegments(updated, plan.departureAt);
      });

      toast.success(`BCP "${bcpLoc.name}" inserted into route.`, { id: toastId });
    } catch (err) {
      toast.error("Failed to route through BCP", {
        id: toastId,
        description: err instanceof Error ? err.message : "Route calculation error",
      });
    }
  }

  async function handleConfirmSplitBcp() {
    if (!bcpSplitProposal) return;
    const { routeToSplit, targetSegmentIndex, detectedBcp } = bcpSplitProposal;
    setIsSplitting(true);
    try {
      let effectiveBcp = detectedBcp;
      if (String(detectedBcp.id).startsWith("preset-")) {
        try {
          const res = await createLocation({
            locationName: detectedBcp.name,
            locationType: "BORDER_GATE",
            address: detectedBcp.address || detectedBcp.name,
            city: detectedBcp.city || "Border",
            country: detectedBcp.country || undefined,
            latitude: detectedBcp.latitude,
            longitude: detectedBcp.longitude,
          });
          const createdId = (res as { locationId?: string | number })?.locationId;
          if (createdId) {
            effectiveBcp = { ...detectedBcp, id: String(createdId) };
            setLocations((prev) => [...prev, effectiveBcp]);
          }
        } catch {
          // ignore error if master creation fails, use preset directly
        }
      }

      if (targetSegmentIndex !== undefined && targetSegmentIndex >= 0 && targetSegmentIndex < segments.length) {
        await insertBcpIntoRoute(effectiveBcp, targetSegmentIndex);
      } else {
        const fromLoc = routeToSplit.fromLocation ?? plan.from;
        const toLoc = routeToSplit.toLocation ?? plan.to;
        if (!fromLoc || !toLoc) throw new Error("Missing endpoints");

        const toastId = toast.loading(`Routing through BCP: ${effectiveBcp.name}...`);
        const preview1 = await previewGeoapifyRoute(
          { latitude: fromLoc.latitude, longitude: fromLoc.longitude },
          { latitude: effectiveBcp.latitude, longitude: effectiveBcp.longitude },
        );
        let actualOrigin = fromLoc;
        let actualBcp1 = effectiveBcp;
        if (preview1.snappedStart) {
          actualOrigin = { ...fromLoc, ...preview1.snappedStart };
          void persistFeasibleLocation(fromLoc, preview1.snappedStart);
        }
        if (preview1.snappedEnd) {
          actualBcp1 = { ...effectiveBcp, ...preview1.snappedEnd };
          void persistFeasibleLocation(effectiveBcp, preview1.snappedEnd);
        }

        const preview2 = await previewGeoapifyRoute(
          { latitude: actualBcp1.latitude, longitude: actualBcp1.longitude },
          { latitude: toLoc.latitude, longitude: toLoc.longitude },
        );
        let actualDest = toLoc;
        if (preview2.snappedEnd) {
          actualDest = { ...toLoc, ...preview2.snappedEnd };
          void persistFeasibleLocation(toLoc, preview2.snappedEnd);
        }

        const route1: MapRoute = {
          id: `dynamic-${fromLoc.id}-${effectiveBcp.id}-${Date.now()}`,
          name: `${fromLoc.name} → ${effectiveBcp.name} (BCP)`,
          fromLocation: actualOrigin,
          toLocation: actualBcp1,
          distanceKm: Math.round(preview1.distanceKm * 10) / 10,
          durationMinutes: Math.round(preview1.durationMinutes),
          transportMode: "ROAD",
          geometry: preview1.geometry,
        };

        const route2: MapRoute = {
          id: `dynamic-${effectiveBcp.id}-${toLoc.id}-${Date.now() + 1}`,
          name: `${effectiveBcp.name} → ${toLoc.name}`,
          fromLocation: actualBcp1,
          toLocation: actualDest,
          distanceKm: Math.round(preview2.distanceKm * 10) / 10,
          durationMinutes: Math.round(preview2.durationMinutes),
          transportMode: "ROAD",
          geometry: preview2.geometry,
        };

        const seg1: DraftSegment = {
          id: `seg-${Date.now()}-1`,
          route: route1,
          arrangement: arrangementForRoute(route1),
          stopType: "BCP",
          dwellAfterMinutes: 30,
        };

        const seg2: DraftSegment = {
          id: `seg-${Date.now()}-2`,
          route: route2,
          arrangement: arrangementForRoute(route2),
          stopType: toLoc.id === plan.to?.id ? "DESTINATION" : "REST_STOP",
          dwellAfterMinutes: 0,
        };

        setSegments((current) => formatDraftSegments([...current, seg1, seg2], plan.departureAt));
        toast.success(`BCP "${effectiveBcp.name}" inserted into route.`, { id: toastId });
      }
      setBcpSplitProposal(null);
    } catch (err) {
      toast.error("Failed to split route through BCP", {
        description: err instanceof Error ? err.message : "Route calculation error",
      });
    } finally {
      setIsSplitting(false);
    }
  }

  function handleDismissSplitBcp() {
    if (!bcpSplitProposal) return;
    if (bcpSplitProposal.targetSegmentIndex === undefined) {
      addSegment(bcpSplitProposal.routeToSplit);
      toast.info("Added as single route without BCP.");
    }
    setBcpSplitProposal(null);
  }

  async function handleCreateNewBcp() {
    if (!newBcpName.trim()) {
      toast.error("Please enter a location name for the BCP.");
      return;
    }
    const lat = parseFloat(newBcpLat);
    const lon = parseFloat(newBcpLon);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Please enter valid latitude and longitude coordinates.");
      return;
    }

    setCreatingBcp(true);
    try {
      const snapResult = await snapToFeasibleRoadPoint({ latitude: lat, longitude: lon });
      const finalLat = snapResult.isSnapped ? snapResult.latitude : lat;
      const finalLon = snapResult.isSnapped ? snapResult.longitude : lon;

      const created = await createLocation({
        locationName: newBcpName.trim(),
        locationType: "BORDER_GATE",
        country: newBcpCountry.trim().toUpperCase() || undefined,
        city: newBcpCity.trim() || undefined,
        address: newBcpAddress.trim() || undefined,
        latitude: finalLat,
        longitude: finalLon,
        locationNote: "Created via Route Plan Builder",
      });

      const newId =
        (created as { locationId?: string | number })?.locationId ??
        (created as { value?: { locationId?: string | number } })?.value?.locationId ??
        `bcp-${Date.now()}`;

      const newMapLoc: MapLocation = {
        id: String(newId),
        name: newBcpName.trim(),
        type: "BORDER_GATE",
        country: newBcpCountry.trim().toUpperCase() || undefined,
        city: newBcpCity.trim() || undefined,
        address: newBcpAddress.trim() || undefined,
        latitude: finalLat,
        longitude: finalLon,
      };

      setLocations((prev) => [newMapLoc, ...prev]);
      toast.success(`BCP "${newBcpName}" added to Master Data.`);
      setShowNewBcpForm(false);
      setNewBcpName("");
      setNewBcpCountry("");
      setNewBcpCity("");
      setNewBcpAddress("");
      setNewBcpLat("");
      setNewBcpLon("");

      await insertBcpIntoRoute(newMapLoc, splitSegmentIndex);
    } catch (err) {
      toast.error("Failed to create BCP in Master Data", {
        description: err instanceof Error ? err.message : "API error",
      });
    } finally {
      setCreatingBcp(false);
    }
  }

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
          : isBcpLocation(route.toLocation)
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
      const match = findBestBcpAlongRoute(found, locations);
      if (match && !hasBcp) {
        setBcpSplitProposal({
          routeToSplit: found,
          detectedBcp: match.bcp,
          distanceKmToRoute: match.distanceKmToRoute,
          isMandatory: match.isMandatory,
        });
      } else {
        addSegment(found);
        toast.success(`${sourceLocation.name} → ${location.name}`, {
          description: "Saved route added.",
        });
      }
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

        const match = findBestBcpAlongRoute(dynamicRoute, locations);
        if (match && !hasBcp) {
          toast.dismiss(loadingToast);
          setBcpSplitProposal({
            routeToSplit: dynamicRoute,
            detectedBcp: match.bcp,
            distanceKmToRoute: match.distanceKmToRoute,
            isMandatory: match.isMandatory,
          });
        } else {
          addSegment(dynamicRoute);
          toast.success(`${sourceLocation.name} → ${location.name}`, {
            id: loadingToast,
            description: `Route calculated: ${dynamicRoute.distanceKm} km (${Math.round(dynamicRoute.durationMinutes ?? 0)} mins).`,
          });
        }
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
      ? continuity.effectiveRoutes.map((route) => {
          const backupSegment = segments.find((segment) => segment.route === route);
          return backupSegment
            ? {
                route,
                routeType: "BACKUP" as const,
                plannedDepartureAt:
                  backupSegment.plannedDepartureAt || plan.departureAt,
                plannedArrivalAt:
                  backupSegment.plannedArrivalAt || plan.arrivalAt,
                vehicleIds: backupSegment.vehicleIds,
                outsourcing:
                  backupSegment.arrangement === "OUTSOURCED" &&
                  backupSegment.provider
                    ? {
                        transportProviderId:
                          backupSegment.provider.transportProviderId,
                        note: backupSegment.note,
                      }
                    : undefined,
              }
            : {
                route,
                routeType: "PRIMARY" as const,
                plannedDepartureAt: plan.departureAt,
                plannedArrivalAt: plan.arrivalAt,
                vehicleIds: undefined,
                outsourcing: undefined,
              };
        })
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
        ({ route, routeType: segmentRouteType, plannedDepartureAt, plannedArrivalAt, vehicleIds, outsourcing }, index): RouteSegmentInput => {
          const isCatalogRoute = Boolean(route.id && !String(route.id).startsWith("dynamic-"));
          return {
            sequenceNo: index + 1,
            ...(isBackup || isReturn ? { routeType: segmentRouteType } : {}),
            ...(isCatalogRoute
              ? { routeId: String(route.id) }
              : {
                  fromLocationId: String(route.fromLocation?.id ?? ""),
                  toLocationId: String(route.toLocation?.id ?? ""),
                  transportMode: route.transportMode ?? "ROAD",
                }),
            plannedDepartureAt,
            plannedArrivalAt,
            ...(outsourcing
              ? { outsourcing }
              : vehicleIds?.length
                ? { vehicleIds }
                : {}),
          };
        },
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
      const mapped = getRoutePlanError(error);
      setSaveError(mapped.code === "VEHICLE_SCHEDULE_CONFLICT"
        ? "This vehicle is already assigned to another Transport during this time slot. Choose another vehicle or adjust the route time."
        : mapped.message);
    }
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 p-3 md:p-4">
      <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-3">
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
        <section className="w-full min-w-0 overflow-hidden rounded-b-[2px] bg-white p-3 md:p-4">
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
            <div className="grid w-full min-w-0 gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
              <div className="w-full min-w-0 min-h-[560px]">
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

              <div className="w-full min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Route Segments Builder</h2>
                  <span className="text-sm text-muted-foreground">
                    {segments.length}{" "}
                    {isReturn ? "return " : isBackup ? "backup " : ""}segment(s)
                  </span>
                </div>

                <div className="grid gap-2 min-w-0">
                  {/* BCP Guidance / Proposal */}
                  {isCrossBorder && hasBcp && (
                    <div className="flex items-center gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
                      <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                      <span>Border Control Point (BCP) added for this cross-border route.</span>
                    </div>
                  )}

                  {bcpSplitProposal !== null && isCrossBorder && !hasBcp && isBcpDismissed && (
                    <div className="flex items-center justify-between rounded-[2px] border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="size-3.5 shrink-0 text-amber-600" />
                        <span>Cross-border route: No Border Control Point (BCP) added yet.</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 rounded-[2px]"
                        onClick={() => setIsBcpDismissed(false)}
                      >
                        Add BCP
                      </Button>
                    </div>
                  )}

                  {bcpSplitProposal !== null && isCrossBorder && !hasBcp && !isBcpDismissed && (
                    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[2px] border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-950 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="font-bold text-amber-950 text-xs">Cross-Border Route</span>
                              <Badge
                                variant="outline"
                                className="border-amber-300 bg-amber-100/60 text-amber-900 px-1 py-0 text-[10px] font-semibold shrink-0"
                              >
                                BCP Required
                              </Badge>
                            </div>
                            <p className="mt-1 text-slate-700 break-words text-xs leading-relaxed">
                              This route crosses an international border. Please add a Border Control Point (BCP).
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground hover:bg-amber-100 rounded-[2px] shrink-0"
                          onClick={() => setIsBcpDismissed(true)}
                          title="Dismiss proposal"
                        >
                          Dismiss
                        </Button>
                      </div>

                      {!showNewBcpForm ? (
                        <div className="mt-3 grid gap-2.5 border-t border-amber-200/80 pt-2.5 min-w-0 w-full overflow-hidden">
                          <div className="grid gap-1 min-w-0 w-full">
                            <label className="text-[11px] font-semibold text-slate-700">Select Existing BCP Stop</label>
                            <Select value={selectedBcpId} onValueChange={setSelectedBcpId}>
                              <SelectTrigger className="h-8 w-full min-w-0 bg-white text-xs rounded-[2px] border-amber-300 *:data-[slot=select-value]:truncate">
                                <SelectValue placeholder={`Choose existing BCP (${bcpLocations.length} available)...`} />
                              </SelectTrigger>
                              <SelectContent className="max-w-[380px] max-h-60 text-xs">
                                {bcpLocations.map((bcp) => (
                                  <SelectItem key={bcp.id} value={String(bcp.id)} className="text-xs">
                                    {bcp.name} {bcp.country ? `(${bcp.country})` : ""} {bcp.city ? `• ${bcp.city}` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {segments.length > 1 && (
                            <div className="grid gap-1 min-w-0 w-full">
                              <label className="text-[11px] font-semibold text-slate-700">Insert After Segment</label>
                              <Select
                                value={String(splitSegmentIndex)}
                                onValueChange={(val) => setSplitSegmentIndex(parseInt(val, 10) || 0)}
                              >
                                <SelectTrigger className="h-8 w-full min-w-0 bg-white text-xs rounded-[2px] border-amber-300 *:data-[slot=select-value]:truncate">
                                  <SelectValue placeholder="Select segment..." />
                                </SelectTrigger>
                                <SelectContent className="max-w-[380px] max-h-60 text-xs">
                                  {segments.map((seg, idx) => (
                                    <SelectItem key={seg.id} value={String(idx)} className="text-xs">
                                      Seg {idx + 1}: {seg.route.fromLocation?.name?.slice(0, 18)}… → {seg.route.toLocation?.name?.slice(0, 18)}…
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1 min-w-0">
                            <Button
                              type="button"
                              size="sm"
                              disabled={!selectedBcpId}
                              className="h-8 rounded-[2px] bg-amber-600 px-3 text-xs text-white hover:bg-amber-700 shrink-0 disabled:opacity-50"
                              onClick={async () => {
                                const bcp = bcpLocations.find((l) => String(l.id) === selectedBcpId);
                                if (bcp) {
                                  await insertBcpIntoRoute(bcp, splitSegmentIndex);
                                  setSelectedBcpId("");
                                }
                              }}
                            >
                              Insert BCP
                            </Button>

                            <span className="text-[11px] text-slate-500">
                              If no matching BCP exists, the detected BCP will be
                              created automatically after RC confirmation.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-[2px] border border-amber-200 bg-white p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold text-slate-900">Add New Border Control Point to Master Data</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs text-muted-foreground hover:bg-slate-100 rounded-[2px]"
                              onClick={() => setShowNewBcpForm(false)}
                            >
                              Cancel
                            </Button>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">BCP Name *</label>
                              <input
                                value={newBcpName}
                                onChange={(e) => setNewBcpName(e.target.value)}
                                placeholder="e.g. Eurotunnel Coquelles BCP"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">Country Code *</label>
                              <input
                                value={newBcpCountry}
                                onChange={(e) => setNewBcpCountry(e.target.value.toUpperCase())}
                                maxLength={2}
                                placeholder="e.g. FR, DE, BE, NL, GB"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">City</label>
                              <input
                                value={newBcpCity}
                                onChange={(e) => setNewBcpCity(e.target.value)}
                                placeholder="e.g. Coquelles"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">Address</label>
                              <input
                                value={newBcpAddress}
                                onChange={(e) => setNewBcpAddress(e.target.value)}
                                placeholder="e.g. Boulevard de l'Europe"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">Latitude *</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={newBcpLat}
                                onChange={(e) => setNewBcpLat(e.target.value)}
                                placeholder="1,000.01"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700">Longitude *</label>
                              <input
                                type="number"
                                step="0.0001"
                                value={newBcpLon}
                                onChange={(e) => setNewBcpLon(e.target.value)}
                                placeholder="1,000.01"
                                className="mt-0.5 h-8 w-full rounded-[2px] border border-slate-200 px-2 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-[2px] text-xs"
                              onClick={() => setShowNewBcpForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={creatingBcp}
                              className="h-8 rounded-[2px] bg-amber-600 px-3 text-xs text-white hover:bg-amber-700"
                              onClick={() => void handleCreateNewBcp()}
                            >
                              {creatingBcp ? "Creating BCP..." : "Save to Master & Insert"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                      <Select
                        onValueChange={async (val) => {
                          const stopLoc = locations.find((l) => String(l.id) === val);
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
                        <SelectTrigger className="mt-1.5 h-8 w-full min-w-0 rounded-[2px] border-slate-200 bg-white text-xs *:data-[slot=select-value]:truncate">
                          <SelectValue placeholder="Select location to insert..." />
                        </SelectTrigger>
                        <SelectContent className="max-w-[380px] max-h-60 text-xs">
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={String(loc.id)} className="text-xs">
                              {loc.name} — {loc.city}, {loc.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Continuation bar for next segment */}
                  {segments.length > 0 && segments[segments.length - 1]?.route?.toLocation && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-blue-200 bg-blue-50/70 p-2.5 text-xs text-blue-950">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 font-bold uppercase text-[10px] text-blue-700">Next segment starts from:</span>
                        <span className="truncate font-semibold text-blue-900">
                          {segments[segments.length - 1].route.toLocation?.name}
                        </span>
                        <span className="text-[11px] text-blue-700">
                          ({segments[segments.length - 1].route.toLocation?.city ? `${segments[segments.length - 1].route.toLocation?.city}, ` : ""}{segments[segments.length - 1].route.toLocation?.country})
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 rounded-[2px] border-blue-300 bg-white px-2 text-[11px] font-semibold text-blue-900 hover:bg-blue-100 shrink-0"
                        onClick={() => {
                          const lastLoc = segments[segments.length - 1].route.toLocation;
                          if (lastLoc) {
                            setSourceLocation(lastLoc);
                            setBuildMessage(`Source selected: ${lastLoc.name}. Choose destination on map.`);
                          }
                        }}
                      >
                        Continue from here →
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit rounded-[2px] text-xs font-medium"
                      onClick={() => setShowRouteSearch((value) => !value)}
                    >
                      {showRouteSearch ? "Close Route Search" : "+ Add Segment"}
                    </Button>
                    {segments.length > 1 && (
                      <span className="text-[11px] text-muted-foreground italic">
                        * Most recent segments displayed first
                      </span>
                    )}
                  </div>

                  {reversedSegments.map(({ segment, index }) => (
                    <BuilderSegmentCard
                      key={segment.id}
                      segment={segment}
                      index={index}
                      totalSegments={segments.length}
                      isLatest={index === segments.length - 1}
                      isReversedOrder={true}
                      onSplitAtBcp={
                        checkIsCrossBorder(segment.route.fromLocation?.country, segment.route.toLocation?.country) &&
                        segment.stopType !== "BCP"
                          ? () => {
                              const match = findBestBcpAlongRoute(segment.route, locations);
                              if (match) {
                                setBcpSplitProposal({
                                  routeToSplit: segment.route,
                                  targetSegmentIndex: index,
                                  detectedBcp: match.bcp,
                                  distanceKmToRoute: match.distanceKmToRoute,
                                  isMandatory: match.isMandatory,
                                });
                              }
                            }
                          : undefined
                      }
                      onDelete={() => deleteSegment(index)}
                      onMoveUp={() => moveSegment(index, index + 1)}
                      onMoveDown={() => moveSegment(index, index - 1)}
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

                  {segments.length > 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-fit rounded-[2px] text-xs font-medium mt-1"
                      onClick={() => setShowRouteSearch((value) => !value)}
                    >
                      {showRouteSearch ? "Close Route Search" : "+ Add Segment"}
                    </Button>
                  )}

                  {showRouteSearch && (
                    <div className="rounded-[2px] border border-slate-200 bg-slate-50 p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          value={routeSearch}
                          onChange={(event) => setRouteSearch(event.target.value)}
                          placeholder="Search saved route or location..."
                          className="h-9 w-full rounded-[2px] border border-slate-200 bg-white px-3 text-xs font-normal"
                        />
                        <Select
                          value={routePlanTypeFilter}
                          onValueChange={(val) =>
                            setRoutePlanTypeFilter(val as RoutePlanRouteFilter)
                          }
                        >
                          <SelectTrigger className="h-9 w-full sm:w-[180px] min-w-0 rounded-[2px] border-slate-200 bg-white text-xs *:data-[slot=select-value]:truncate" aria-label="Filter route plan type">
                            <SelectValue placeholder="Filter route plan type" />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="ALL">All Route Plan Types</SelectItem>
                            <SelectItem value="PRIMARY">PRIMARY</SelectItem>
                            <SelectItem value="BACKUP">BACKUP</SelectItem>
                            <SelectItem value="RETURN">RETURN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
                        {filteredRoutes.map((route) => (
                          <button
                            key={route.id}
                            type="button"
                            className="rounded-[2px] border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-amber-500 hover:bg-amber-50/50"
                            onClick={() => {
                              const match = findBestBcpAlongRoute(route, locations);
                              if (match && !hasBcp) {
                                setBcpSplitProposal({
                                  routeToSplit: route,
                                  detectedBcp: match.bcp,
                                  distanceKmToRoute: match.distanceKmToRoute,
                                  isMandatory: match.isMandatory,
                                });
                              } else {
                                addSegment(route);
                              }
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
            <div className="grid w-full min-w-0 gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
              <div className="w-full min-w-0 min-h-[560px]">
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

              <div className="w-full min-w-0 grid content-start gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Review</h2>
                {bcpSplitProposal !== null && isCrossBorder && !hasBcp && (
                  <div className="rounded-[2px] border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="size-4 text-amber-600 shrink-0" />
                      <span>Cross-Border Route</span>
                    </div>
                    <p className="mt-1 text-slate-700">
                      This route crosses an international border. A Border Control Point (BCP) is required. You can return to Step 1 to add a BCP.
                    </p>
                  </div>
                )}
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

      <BcpRouteSplitDialog
        open={Boolean(bcpSplitProposal)}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleDismissSplitBcp();
        }}
        routeToSplit={bcpSplitProposal?.routeToSplit ?? null}
        detectedBcp={bcpSplitProposal?.detectedBcp ?? null}
        distanceKmToRoute={bcpSplitProposal?.distanceKmToRoute ?? 0}
        isMandatory={bcpSplitProposal?.isMandatory ?? false}
        isFinalDestination={
          bcpSplitProposal
            ? bcpSplitProposal.targetSegmentIndex !== undefined
              ? segments[bcpSplitProposal.targetSegmentIndex]?.stopType === "DESTINATION" ||
                bcpSplitProposal.routeToSplit.toLocation?.id === plan.to?.id
              : bcpSplitProposal.routeToSplit.toLocation?.id === plan.to?.id
            : false
        }
        isSplitting={isSplitting}
        onConfirmSplit={handleConfirmSplitBcp}
        onDismiss={handleDismissSplitBcp}
      />
    </main>
  );
}
