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
import { createRoutePlan } from "../services";
import type { CreateRoutePlanRequest, RouteSegmentInput } from "../types";

type WizardStep = 0 | 1 | 2;

type TransportPlanSummary = {
  transportPlanId: string;
  planCode: string;
  bookingCode: string;
  routeType: "PRIMARY" | "BACKUP";
  status: "DRAFT" | "APPROVED";
  scope: "International" | "Domestic";
  departureAt: string;
  arrivalAt: string;
  from: MapLocation;
  to: MapLocation;
};

type DraftSegment = {
  id: string;
  route: MapRoute;
  arrangement: "INTERNAL" | "OUTSOURCED";
  stopType: "REST_STOP" | "BCP" | "DESTINATION";
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

const steps = ["Transport Details", "Route Builder", "Review & Save"];

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
  onArrangementChange,
}: {
  segment: DraftSegment;
  index: number;
  onDelete: () => void;
  onArrangementChange: (value: DraftSegment["arrangement"]) => void;
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
              <label>
                <span className="text-muted-foreground">Arrangement</span>
                <select
                  className="mt-1 h-7 w-full rounded border bg-white px-1 text-xs"
                  value={segment.arrangement}
                  onChange={(event) =>
                    onArrangementChange(
                      event.target.value as DraftSegment["arrangement"],
                    )
                  }
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="OUTSOURCED">3rd Party</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RoutePlanBuilder({
  transportPlanId = MOCK_PLAN.transportPlanId,
}: {
  transportPlanId?: string;
}) {
  const [step, setStep] = useState<WizardStep>(0);
  const [, setMode] = useState<MapMode>("buildPlan");
  const [segments, setSegments] = useState<DraftSegment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const plan = useMemo(
    () => ({ ...MOCK_PLAN, transportPlanId }),
    [transportPlanId],
  );
  const selectedRoutes = useMemo(
    () => segments.map((segment) => segment.route),
    [segments],
  );

  function addSegment(route: MapRoute) {
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
      segments: segments.map((segment, index): RouteSegmentInput => ({
        sequenceNo: index + 1,
        routeId: String(segment.route.id),
        fromLocationId: String(segment.route.fromLocation?.id),
        toLocationId: String(segment.route.toLocation?.id),
        transportMode: segment.route.transportMode,
        plannedDepartureAt: plan.departureAt,
        plannedArrivalAt: plan.arrivalAt,
        ...(segment.arrangement === "OUTSOURCED"
          ? { outsourcing: { transportProviderId: "provider-placeholder" } }
          : {}),
      })),
    };
  }

  async function save(action: CreateRoutePlanRequest["action"]) {
    if (!segments.length) {
      setMessage("Add at least one segment before saving.");
      return;
    }
    if (transportPlanId === MOCK_PLAN.transportPlanId) {
      setMessage(
        `${action === "SAVE_DRAFT" ? "Draft" : "Legal review"} payload ready. Transport Plan is still mock data.`,
      );
      return;
    }
    try {
      await createRoutePlan(transportPlanId, toPayload(action));
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
                  <Badge variant="outline">Build mode</Badge>
                </div>
                <MapViewer
                  locations={MOCK_LOCATIONS}
                  routes={MOCK_ROUTES}
                  mode="buildPlan"
                  onModeChange={setMode}
                  onRouteSelect={addSegment}
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">Route Segments Builder</h2>
                  <span className="text-sm text-muted-foreground">
                    {segments.length} segment(s)
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
                      onArrangementChange={(arrangement) =>
                        setSegments((items) =>
                          items.map((item) =>
                            item.id === segment.id
                              ? { ...item, arrangement }
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
                  locations={MOCK_LOCATIONS}
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
            disabled={step === 2 || (step === 1 && !segments.length)}
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
