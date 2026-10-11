import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import {
  MapViewer,
  type MapLocation,
  type MapMode,
  type MapRoute,
} from "@/shared/components/map";
import { PageHeader } from "@/shared/components/PageHeader";
import { ROLE_ROUTES } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { createRoutePlan, updateRoutePlan } from "../services";
import {
  buildEffectiveBackupRoute,
  validateRoutePlanRoute,
} from "../route-continuity";
import type {
  CreateRoutePlanRequest,
  RouteSegmentInput,
  RoutePlanStatus,
  RouteType,
} from "../types";
import {
  OutsourceSegmentDialog,
  type OutsourceSegmentSelection,
} from "./OutsourceSegmentDialog";
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

const FALLBACK_LOCATION: MapLocation = {
  id: "unknown-location",
  name: "Select a route origin",
  city: "—",
  country: "—",
  latitude: 0,
  longitude: 0,
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

const MOCK_PLAN: TransportPlanSummary = {
  transportPlanId: "mock-transport-plan",
  planCode: "TP-20261001-001",
  bookingCode: "REQ-20261001-0005",
  routeType: "PRIMARY",
  status: "CONFIRMED",
  scope: "International",
  departureAt: "2026-10-27T09:30:00Z",
  arrivalAt: "2026-10-30T09:30:00Z",
  from: {
    id: "paris",
    name: "Paris",
    city: "Paris",
    country: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  to: {
    id: "frankfurt",
    name: "Frankfurt",
    city: "Frankfurt",
    country: "DE",
    latitude: 50.1109,
    longitude: 8.6821,
  },
};

const MOCK_LOCATIONS: MapLocation[] = [
  MOCK_PLAN.from,
  {
    id: "metz",
    name: "Metz",
    city: "Metz",
    country: "FR",
    latitude: 49.1193,
    longitude: 6.1757,
  },
  {
    id: "luxembourg",
    name: "Luxembourg BCP",
    type: "BORDER_GATE",
    city: "Luxembourg",
    country: "LU",
    latitude: 49.6116,
    longitude: 6.1319,
  },
  {
    id: "cologne",
    name: "Cologne Rest Stop",
    type: "REST_STOP",
    city: "Cologne",
    country: "DE",
    latitude: 50.9375,
    longitude: 6.9603,
  },
  MOCK_PLAN.to,
];

const MOCK_ROUTES: MapRoute[] = [
  {
    id: "route-paris-metz",
    name: "Paris → Metz",
    transportMode: "ROAD",
    fromLocation: MOCK_LOCATIONS[0],
    toLocation: MOCK_LOCATIONS[1],
    distanceKm: 315,
    durationMinutes: 225,
    geometry: {
      type: "LineString",
      coordinates: [
        [2.3522, 48.8566],
        [6.1757, 49.1193],
      ],
    },
  },
  {
    id: "route-metz-luxembourg",
    name: "Metz → Luxembourg BCP",
    transportMode: "ROAD",
    fromLocation: MOCK_LOCATIONS[1],
    toLocation: MOCK_LOCATIONS[2],
    distanceKm: 88,
    durationMinutes: 75,
    geometry: {
      type: "LineString",
      coordinates: [
        [6.1757, 49.1193],
        [6.1319, 49.6116],
      ],
    },
  },
  {
    id: "route-luxembourg-cologne",
    name: "Luxembourg BCP → Cologne Rest Stop",
    transportMode: "AIR",
    fromLocation: MOCK_LOCATIONS[2],
    toLocation: MOCK_LOCATIONS[3],
    distanceKm: 189,
    durationMinutes: 140,
  },
  {
    id: "route-cologne-frankfurt",
    name: "Cologne Rest Stop → Frankfurt",
    transportMode: "ROAD",
    fromLocation: MOCK_LOCATIONS[3],
    toLocation: MOCK_PLAN.to,
    distanceKm: 102,
    durationMinutes: 90,
    geometry: {
      type: "LineString",
      coordinates: [
        [6.9603, 50.9375],
        [8.6821, 50.1109],
      ],
    },
  },
];

const MOCK_BACKUP_ROUTES: MapRoute[] = [
  {
    id: "backup-route-metz-cologne",
    name: "Metz → Cologne Rest Stop (Backup)",
    transportMode: "ROAD",
    fromLocation: MOCK_LOCATIONS[1],
    toLocation: MOCK_LOCATIONS[3],
    distanceKm: 310,
    durationMinutes: 210,
  },
  {
    id: "backup-route-cologne-frankfurt",
    name: "Cologne Rest Stop → Frankfurt (Backup)",
    transportMode: "ROAD",
    fromLocation: MOCK_LOCATIONS[3],
    toLocation: MOCK_PLAN.to,
    distanceKm: 102,
    durationMinutes: 90,
  },
];

const steps = ["Transport Details", "Route Builder", "Save"];
void MOCK_ROUTES;
void MOCK_BACKUP_ROUTES;
void MOCK_PLAN;
void MOCK_LOCATIONS;

function formatDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function Metadata({ plan }: { plan: TransportPlanSummary }) {
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

function Progress({
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

function SegmentCard({
  segment,
  index,
  onDelete,
  onOutsource,
  routePlanId,
}: {
  segment: DraftSegment;
  index: number;
  onDelete: () => void;
  onOutsource: (selection: OutsourceSegmentSelection | null) => void;
  routePlanId?: string;
}) {
  const principal = useAuthStore((state) => state.principal);
  const canManageOutsource = canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER"],
  });
  return (
    <Card className="gap-2 rounded-[2px] py-2 shadow-sm">
      <CardContent className="px-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-[2px] bg-slate-600 text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {segment.route.fromLocation?.name}{" "}
                <span className="text-slate-400">→</span>{" "}
                {segment.route.toLocation?.name}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Delete segment"
                >
                  <Trash2 className="size-4" />
                </button>
                <MoreVertical className="size-4" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Distance</p>
                <p className="font-semibold">
                  {segment.route.distanceKm ?? "—"} km
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated time</p>
                <p className="font-semibold">
                  {segment.route.durationMinutes
                    ? `${Math.round(segment.route.durationMinutes / 60)}h ${segment.route.durationMinutes % 60}m`
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
                      routePlanRouteId={
                        segment.route.routePlanRouteId ??
                        String(segment.route.id)
                      }
                      transportMode={segment.route.transportMode ?? "ROAD"}
                      isOutsourced={segment.arrangement === "OUTSOURCED"}
                      currentProvider={segment.provider}
                      currentNote={segment.note}
                      onChanged={onOutsource}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        {segment.arrangement === "OUTSOURCED"
                          ? "Outsource"
                          : "Internal"}
                      </Button>
                    </OutsourceSegmentDialog>
                  ) : (
                    <span className="font-semibold">
                      {segment.arrangement === "OUTSOURCED"
                        ? "Outsource"
                        : "Internal"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

void Metadata;
void Progress;
void SegmentCard;

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
  locations,
  routes,
  edit,
}: RoutePlanBuilderProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [, setMode] = useState<MapMode>("buildPlan");
  const [segments, setSegments] = useState<DraftSegment[]>(() =>
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
    })),
  );
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [routeNote, setRouteNote] = useState(initialRouteNote);
  const [updateReason, setUpdateReason] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [routePlanTypeFilter, setRoutePlanTypeFilter] = useState<RoutePlanRouteFilter>("ALL");
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [sourceLocation, setSourceLocation] = useState<MapLocation | null>(null);
  const [returnOrigin, setReturnOrigin] = useState<MapLocation | null>(
    () => initialRoutes[0]?.fromLocation ?? null,
  );
  const isBackup = routeType === "BACKUP";
  const isReturn = routeType === "RETURN";
  const readonlyPrimaryRoutes = useMemo(
    () => primaryRoutes ?? [],
    [primaryRoutes],
  );
  const fallbackFrom =
    (isReturn ? returnOrigin : null) ??
    readonlyPrimaryRoutes[0]?.fromLocation ??
    initialRoutes[0]?.fromLocation ??
    FALLBACK_LOCATION;
  const fallbackTo =
    readonlyPrimaryRoutes.at(-1)?.toLocation ??
    initialRoutes.at(-1)?.toLocation ??
    fallbackFrom;
  const plan = useMemo(
    () => ({
      ...metadata,
      planCode: metadata?.planCode ?? "—",
      bookingCode: metadata?.bookingCode ?? "—",
      status: metadata?.status ?? "DRAFT",
      scope: metadata?.scope ?? "Domestic",
      departureAt: metadata?.departureAt ?? "",
      arrivalAt: metadata?.arrivalAt ?? "",
      from: isReturn ? fallbackFrom : (metadata?.from ?? fallbackFrom),
      to: isReturn ? (metadata?.from ?? fallbackTo) : (metadata?.to ?? fallbackTo),
      transportPlanId,
      routeType,
    }),
    [fallbackFrom, fallbackTo, isReturn, metadata, routeType, transportPlanId],
  );
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
    return routeCatalog.filter((route) =>
      (routePlanTypeFilter === "ALL" || route.routePlanType === routePlanTypeFilter) &&
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
  const continuity = useMemo(
    () =>
      isBackup
        ? buildEffectiveBackupRoute(
            readonlyPrimaryRoutes,
            segments.map((segment) => segment.route),
            plan.from.id,
            plan.to.id,
          )
        : validateRoutePlanRoute(
            segments.map((segment) => segment.route),
            plan.from.id,
            plan.to.id,
          ),
    [isBackup, plan.from.id, plan.to.id, readonlyPrimaryRoutes, segments],
  );

  function addSegment(route: MapRoute) {
    if (route.readonly) {
      setBuildMessage(
        "Primary segments are view-only. Select a backup route to add it.",
      );
      return;
    }
    if (segments.some((segment) => segment.route.id === route.id)) return;
    const previous = segments.at(-1)?.route.toLocation?.id;
    if (previous != null && route.fromLocation?.id !== previous) {
      setBuildMessage("Select a route connected to the last segment.");
      return;
    }
    setBuildMessage(null);
    setSegments((current) => [
      ...current,
      {
        id: `${route.id}-${Date.now()}`,
        route,
        arrangement: arrangementForRoute(route),
        stopType:
          route.toLocation?.id === plan.to.id
            ? "DESTINATION"
            : route.toLocation?.type === "BORDER_GATE"
              ? "BCP"
              : "REST_STOP",
      },
    ]);
  }

  function selectMapLocation(location: MapLocation) {
    if (isReturn) {
      setReturnOrigin(location);
      setBuildMessage(`Return origin selected: ${location.name}.`);
      return;
    }
    if (!sourceLocation) {
      setSourceLocation(location);
      setBuildMessage(`Source selected: ${location.name}. Please choose a Destination.`);
      return;
    }
    if (String(sourceLocation.id) === String(location.id)) {
      setBuildMessage("Source and Destination must be different.");
      return;
    }
    const found = routeCatalog.find(
      (route) =>
        String(route.fromLocation?.id) === String(sourceLocation.id) &&
        String(route.toLocation?.id) === String(location.id),
    );
    if (found) {
      toast(`${sourceLocation.name} → ${location.name}`, {
        description: "Saved Route found.",
        duration: 3000,
        action: {
          label: "Add",
          onClick: () => {
            addSegment(found);
          },
        },
      });
    } else {
      toast.error(`${sourceLocation.name} → ${location.name}`, {
        description: "No saved Route exists between these Locations.",
      });
    }
    setSourceLocation(null);
  }

  function toPayload(
    action: CreateRoutePlanRequest["action"],
  ): CreateRoutePlanRequest {
    return {
      routeType: plan.routeType,
      action,
      ...(isBackup || isReturn ? { routeNote: routeNote.trim() } : {}),
      segments: segments.map((segment, index): RouteSegmentInput => ({
        sequenceNo: index + 1,
        routeId: String(segment.route.id),
        fromLocationId: String(segment.route.fromLocation?.id),
        toLocationId: String(segment.route.toLocation?.id),
        transportMode: segment.route.transportMode,
        plannedDepartureAt: plan.departureAt,
        plannedArrivalAt: plan.arrivalAt,
        ...(segment.arrangement === "OUTSOURCED" && segment.provider
          ? {
              outsourcing: {
                transportProviderId: segment.provider.transportProviderId,
                note: segment.note,
              },
            }
          : {}),
      })),
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
          ? "Draft saved."
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
              onFromChange={setReturnOrigin}
            />
          )}
          {step === 1 && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Route Map</h2>
                  <Badge variant="outline">
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
                  <h2 className="font-semibold">Route Segments Builder</h2>
                  <span className="text-sm text-muted-foreground">
                    {segments.length} {isReturn ? "return " : isBackup ? "backup " : ""}segment(s)
                  </span>
                </div>
                <div className="grid gap-2">
                  <div className="hidden">
                    <label className="grid gap-2 text-sm font-medium">
                      Search saved Route
                      <input
                        value={routeSearch}
                        onChange={(event) => setRouteSearch(event.target.value)}
                        placeholder="Search by route or Location"
                        className="h-9 rounded border bg-white px-3 font-normal"
                      />
                    </label>
                    <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
                      {filteredRoutes.map((route) => (
                        <button
                          key={route.id}
                          type="button"
                          className="rounded border bg-white px-3 py-2 text-left text-sm hover:border-amber-500 hover:bg-amber-50"
                          onClick={() => addSegment(route)}
                        >
                          <span className="block font-medium">{route.name ?? "Unnamed Route"}</span>
                          <span className="text-xs text-muted-foreground">
                            {route.fromLocation?.name} → {route.toLocation?.name} · {route.transportMode ?? "ROAD"}
                          </span>
                        </button>
                      ))}
                      {!filteredRoutes.length && <p className="text-xs text-muted-foreground">No saved Route found.</p>}
                    </div>
                  </div>
                  {segments.map((segment, index) => (
                    <BuilderSegmentCard
                      key={segment.id}
                      segment={segment}
                      index={index}
                      onDelete={() =>
                        setSegments((items) =>
                          items.filter((item) => item.id !== segment.id),
                        )
                      }
                      routePlanId={edit?.routePlanId}
                      onOutsource={(selection) =>
                        setSegments((items) =>
                          items.map((item) =>
                            item.id === segment.id
                              ? {
                                  ...item,
                                  arrangement: selection
                                    ? "OUTSOURCED"
                                    : "INTERNAL",
                                  provider: selection?.provider,
                                  note: selection?.note,
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
                    className="w-fit"
                    onClick={() => setShowRouteSearch((value) => !value)}
                  >
                    {showRouteSearch ? "Close Route Search" : "+ Add Segment"}
                  </Button>
                  {showRouteSearch && (
                    <div className="rounded border bg-slate-50 p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          value={routeSearch}
                          onChange={(event) => setRouteSearch(event.target.value)}
                          placeholder="Search saved Route or Location"
                          className="h-9 w-full rounded border bg-white px-3 text-sm"
                        />
                        <select
                          value={routePlanTypeFilter}
                          onChange={(event) => setRoutePlanTypeFilter(event.target.value as RoutePlanRouteFilter)}
                          className="h-9 rounded border bg-white px-3 text-sm"
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
                            className="rounded border bg-white px-3 py-2 text-left text-sm hover:border-amber-500 hover:bg-amber-50"
                            onClick={() => {
                              addSegment(route);
                              setShowRouteSearch(false);
                            }}
                          >
                            <span className="block font-medium">{route.name ?? "Unnamed Route"}</span>
                            <span className="text-xs text-muted-foreground">
                              {route.fromLocation?.name} → {route.toLocation?.name} · {route.transportMode ?? "ROAD"}
                            </span>
                          </button>
                        ))}
                        {!filteredRoutes.length && <p className="text-xs text-muted-foreground">No saved Route found.</p>}
                      </div>
                    </div>
                  )}
                  {buildMessage && (
                    <p className="text-sm text-amber-700">{buildMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Route Map</h2>
                  <Badge variant="outline">View mode</Badge>
                </div>
                <MapViewer
                  locations={locations}
                  routes={selectedRoutes}
                  mode="view"
                />
              </div>
              <div className="grid content-start gap-3">
                <h2 className="text-lg font-semibold">Review</h2>
                <Card className="rounded-[2px]">
                  <CardContent className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Segments</span>
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
                        outsourced
                      </b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route type</span>
                      <b>{plan.routeType}</b>
                    </div>
                  </CardContent>
                </Card>
                {(isBackup || isReturn) && (
                  <label className="grid gap-2 text-sm font-medium">
                    {isReturn ? "Return reason" : "Backup reason"}
                    <span className="font-normal text-muted-foreground">
                      Minimum 10 characters
                    </span>
                    <textarea
                      className="min-h-20 rounded-[2px] border px-2 py-1.5 font-normal"
                      value={routeNote}
                      onChange={(event) => setRouteNote(event.target.value)}
                      placeholder="Why is this backup route needed?"
                    />
                  </label>
                )}
                {edit && (
                  <label className="grid gap-2 text-sm font-medium">
                    <textarea
                      aria-label="Update reason"
                      className="min-h-20 rounded-[2px] border px-2 py-1.5 font-normal"
                      value={updateReason}
                      onChange={(event) => setUpdateReason(event.target.value)}
                      placeholder="Why is this route plan being updated?"
                    />
                  </label>
                )}
                {saveError && (
                  <p className="text-sm text-red-700">{saveError}</p>
                )}
                {saveNotice && (
                  <p className="text-sm text-emerald-700">{saveNotice}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void save("SAVE_DRAFT")}>
                    Save Draft
                  </Button>
                  {!isReturn && (
                    <Button
                      variant="outline"
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
            disabled={step === 0}
            onClick={() =>
              setStep((value) => Math.max(0, value - 1) as WizardStep)
            }
          >
            <ArrowLeft /> Back
          </Button>
          <Button
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
            Next <ArrowRight />
          </Button>
        </div>
      </div>
    </main>
  );
}
