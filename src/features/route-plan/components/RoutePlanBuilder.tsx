import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  MapPin,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  MapViewer,
  type MapLocation,
  type MapMode,
  type MapRoute,
} from "@/shared/components/map";
import { createRoutePlan, updateRoutePlan } from "../services";
import {
  buildEffectiveBackupRoute,
  validateRoutePlanRoute,
} from "../route-continuity";
import {
  OutsourceSegmentDialog,
  type OutsourceSegmentSelection,
} from "./OutsourceSegmentDialog";
import type { Provider } from "../types";
import type { CreateRoutePlanRequest, RouteSegmentInput } from "../types";

type WizardStep = 0 | 1 | 2;

type TransportPlanSummary = {
  transportPlanId: string;
  planCode: string;
  bookingCode: string;
  routeType: "PRIMARY" | "BACKUP";
  status: string;
  scope: "International" | "Domestic";
  departureAt: string;
  arrivalAt: string;
  from: MapLocation;
  to: MapLocation;
};

export type RoutePlanBuilderMetadata = Partial<
  Omit<TransportPlanSummary, "from" | "to">
> & {
  from?: MapLocation;
  to?: MapLocation;
};

type DraftSegment = {
  id: string;
  route: MapRoute;
  arrangement: "INTERNAL" | "OUTSOURCED";
  stopType: "REST_STOP" | "BCP" | "DESTINATION";
  provider?: Provider;
  note?: string;
};

const MOCK_PLAN: TransportPlanSummary = {
  transportPlanId: "mock-transport-plan",
  planCode: "TP-20261001-001",
  bookingCode: "REQ-20261001-0005",
  routeType: "PRIMARY",
  status: "APPROVED",
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

const steps = ["Transport Details", "Route Builder", "Review & Save"];
void MOCK_ROUTES;
void MOCK_BACKUP_ROUTES;
void MOCK_PLAN;
void MOCK_LOCATIONS;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function Metadata({ plan }: { plan: TransportPlanSummary }) {
  const items = [
    ["TRANSPORT PLAN", plan.planCode],
    ["BOOKING", plan.bookingCode],
    ["ROUTE TYPE", plan.routeType],
    ["STATUS", plan.status],
    ["SCOPE", plan.scope],
    ["PLANNED DEPARTURE", formatDate(plan.departureAt)],
    ["PLANNED ARRIVAL", formatDate(plan.arrivalAt)],
    ["FROM", plan.from.name],
    ["TO", plan.to.name],
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-9">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="min-h-20 border-b border-r px-4 py-3 last:border-r-0 lg:border-b-0"
        >
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
    <div className="grid overflow-hidden rounded-t-xl border border-b-0 bg-card sm:grid-cols-3">
      {steps.map((label, index) => (
        <button
          key={label}
          type="button"
          disabled={index > step + 1}
          onClick={() => index <= step && onChange(index as WizardStep)}
          className={`border-b-4 px-5 py-4 text-left transition ${step === index ? "border-amber-500 text-slate-900" : "border-transparent text-muted-foreground"} disabled:cursor-not-allowed`}
        >
          <span className="block text-[10px] font-bold tracking-[0.15em] text-amber-600">
            STEP {String(index + 1).padStart(2, "0")}
          </span>
          <span className="mt-1 block font-[var(--heading)] text-lg font-bold uppercase">
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
  return (
    <Card className="gap-3 rounded-lg py-3 shadow-sm">
      <CardContent className="px-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-slate-600 text-xs font-bold text-white">
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
                <GripVertical className="size-4" aria-label="Reorder segment" />
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
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
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
                <Badge variant="outline" className="mt-1">
                  {segment.stopType.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Arrangement</span>
                <div className="mt-1">
                  <OutsourceSegmentDialog
                    routePlanId={routePlanId}
                    routePlanRouteId={
                      segment.route.routePlanRouteId ?? String(segment.route.id)
                    }
                    transportMode={segment.route.transportMode ?? "ROAD"}
                    isOutsourced={segment.arrangement === "OUTSOURCED"}
                    currentProvider={segment.provider}
                    currentNote={segment.note}
                    onChanged={onOutsource}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type RoutePlanBuilderProps = {
  transportPlanId: string;
  routeType?: "PRIMARY" | "BACKUP";
  primaryRoutes?: MapRoute[];
  backupRoutes?: MapRoute[];
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
      arrangement: "INTERNAL",
      stopType:
        route.toLocation?.id === metadata?.to?.id
          ? "DESTINATION"
          : route.toLocation?.type === "BORDER_GATE"
            ? "BCP"
            : "REST_STOP",
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [routeNote, setRouteNote] = useState(initialRouteNote);
  const [updateReason, setUpdateReason] = useState("");
  const isBackup = routeType === "BACKUP";
  const readonlyPrimaryRoutes = primaryRoutes ?? [];
  const plan = useMemo(
    () => ({
      ...metadata,
      from: metadata?.from,
      to: metadata?.to,
      transportPlanId,
      routeType,
    }),
    [metadata, routeType, transportPlanId],
  );
  const routeCatalog = useMemo(
    () =>
      [
        ...(isBackup ? (backupRoutes ?? routes) : routes),
        ...initialRoutes,
      ].filter(
        (route, index, routes) =>
          routes.findIndex((item) => item.id === route.id) === index,
      ),
    [backupRoutes, initialRoutes, isBackup, routes],
  );
  const mapRoutes = useMemo(
    () =>
      isBackup
        ? [
            ...readonlyPrimaryRoutes.map((route) => ({
              ...route,
              readonly: true,
            })),
            ...routeCatalog,
          ]
        : routeCatalog,
    [isBackup, readonlyPrimaryRoutes, routeCatalog],
  );
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
      setMessage(
        "Primary segments are view-only. Select a backup route to add it.",
      );
      return;
    }
    if (segments.some((segment) => segment.route.id === route.id)) return;
    const previous = segments.at(-1)?.route.toLocation?.id;
    if (previous != null && route.fromLocation?.id !== previous) {
      setMessage("Select a route connected to the last segment.");
      return;
    }
    setMessage(null);
    setSegments((current) => [
      ...current,
      {
        id: `${route.id}-${Date.now()}`,
        route,
        arrangement: "INTERNAL",
        stopType:
          route.toLocation?.id === plan.to.id
            ? "DESTINATION"
            : route.toLocation?.type === "BORDER_GATE"
              ? "BCP"
              : "REST_STOP",
      },
    ]);
  }

  function toPayload(
    action: CreateRoutePlanRequest["action"],
  ): CreateRoutePlanRequest {
    return {
      routeType: plan.routeType,
      action,
      ...(isBackup ? { routeNote: routeNote.trim() } : {}),
      segments: segments.map((segment, index): RouteSegmentInput => ({
        sequenceNo: index + 1,
        routeId: String(segment.route.id),
        fromLocationId: String(segment.route.fromLocation?.id),
        toLocationId: String(segment.route.toLocation?.id),
        transportMode: segment.route.transportMode,
        plannedDepartureAt: plan.departureAt,
        plannedArrivalAt: plan.arrivalAt,
        ...(segment.arrangement === "OUTSOURCED"
          ? {
              outsourcing: {
                transportProviderId:
                  segment.provider?.transportProviderId ?? "",
                note: segment.note,
              },
            }
          : {}),
      })),
    };
  }

  async function save(action: CreateRoutePlanRequest["action"]) {
    if (!segments.length) {
      setMessage("Add at least one segment before saving.");
      return;
    }
    if (
      segments.some(
        (segment) => segment.arrangement === "OUTSOURCED" && !segment.provider,
      )
    ) {
      setMessage(
        "Please select a valid Transport Provider for every outsourced segment.",
      );
      return;
    }
    if (!continuity.valid) {
      setMessage(continuity.message ?? "Route segments are not continuous.");
      return;
    }
    if (isBackup && !primaryAvailable) {
      setMessage(
        "A valid PRIMARY route plan is required before creating a backup route.",
      );
      return;
    }
    if (isBackup && routeNote.trim().length < 10) {
      setMessage("Backup reason must be at least 10 characters.");
      return;
    }
    if (edit && !updateReason.trim()) {
      setMessage("Update reason is required.");
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
      setMessage(
        action === "SAVE_DRAFT"
          ? "Draft saved."
          : "Submitted for legal review.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save route plan.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto grid max-w-[1440px] gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary">
              RC · ROUTE PLANNING
            </p>
            <h1 className="mt-1 font-[var(--heading)] text-3xl font-bold uppercase text-slate-900">
              Create Route Plan
            </h1>
          </div>
          <Badge variant="outline">{plan.status}</Badge>
        </div>
        <Metadata plan={plan} />
        <Progress step={step} onChange={setStep} />
        <section className="rounded-b-xl border bg-white p-4 md:p-6">
          {step === 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Origin</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 text-emerald-600" />
                    <div>
                      <p className="text-xl font-semibold">{plan.from.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.from.city}, {plan.from.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Destination</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 text-red-600" />
                    <div>
                      <p className="text-xl font-semibold">{plan.to.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.to.city}, {plan.to.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground lg:col-span-2">
                Origin and destination come from the approved Transport Plan.
                They are display-only in this step.
              </p>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">
                    Route Map & Suggested Routes
                  </h2>
                  <Badge variant="outline">
                    {isBackup ? "Build backup mode" : "Build mode"}
                  </Badge>
                </div>
                {isBackup && !primaryAvailable && (
                  <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {primaryError ??
                      "Primary route plan not found. Please create a primary route plan first."}
                  </div>
                )}
                <MapViewer
                  locations={locations}
                  routes={mapRoutes}
                  mode="buildPlan"
                  onModeChange={setMode}
                  onRouteSelect={addSegment}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Route Segments Builder</h2>
                  <span className="text-sm text-muted-foreground">
                    {segments.length} {isBackup ? "backup " : ""}segment(s)
                  </span>
                </div>
                <div className="grid gap-3">
                  {segments.map((segment, index) => (
                    <SegmentCard
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
                    onClick={() =>
                      setMessage("Choose a route on the map to add a segment.")
                    }
                  >
                    + Add Segment
                  </Button>
                  {message && (
                    <p className="text-sm text-amber-700">{message}</p>
                  )}
                  {continuity.message && (
                    <p className="text-sm text-red-700">{continuity.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.9fr)]">
              <div className="min-h-[560px]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Route Map</h2>
                  <Badge variant="outline">View mode</Badge>
                </div>
                <MapViewer
                  locations={locations}
                  routes={selectedRoutes}
                  mode="view"
                />
              </div>
              <div className="grid content-start gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Review Route Plan</CardTitle>
                  </CardHeader>
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
                <p className="text-sm text-muted-foreground">
                  BE validates continuity, rest rules, BCP, vehicle capacity and
                  provider compatibility.
                </p>
                {continuity.message && (
                  <p className="text-sm text-red-700">{continuity.message}</p>
                )}
                {isBackup && (
                  <label className="grid gap-2 text-sm font-medium">
                    Backup reason
                    <span className="font-normal text-muted-foreground">
                      Minimum 10 characters
                    </span>
                    <textarea
                      className="min-h-24 rounded border px-3 py-2 font-normal"
                      value={routeNote}
                      onChange={(event) => setRouteNote(event.target.value)}
                      placeholder="Why is this backup route needed?"
                    />
                  </label>
                )}
                {edit && (
                  <label className="grid gap-2 text-sm font-medium">
                    Update reason
                    <span className="font-normal text-muted-foreground">
                      Required for optimistic locking audit
                    </span>
                    <textarea
                      className="min-h-24 rounded border px-3 py-2 font-normal"
                      value={updateReason}
                      onChange={(event) => setUpdateReason(event.target.value)}
                      placeholder="Why is this route plan being updated?"
                    />
                  </label>
                )}
                {message && (
                  <p className="text-sm text-emerald-700">{message}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void save("SAVE_DRAFT")}>
                    Save Draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void save("SUBMIT_FOR_LEGAL_REVIEW")}
                  >
                    Submit for legal review
                  </Button>
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
                  (isBackup && !primaryAvailable)))
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
