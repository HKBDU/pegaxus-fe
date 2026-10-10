import { MoreVertical, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { MapLocation, MapRoute } from "@/shared/components/map";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  OutsourceSegmentDialog,
  type OutsourceSegmentSelection,
} from "./OutsourceSegmentDialog";
import type { Provider, RouteType } from "../types";

export type WizardStep = 0 | 1 | 2;

export type TransportPlanSummary = {
  transportPlanId: string;
  planCode: string;
  bookingCode: string;
  routeType: RouteType;
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

export type DraftSegment = {
  id: string;
  route: MapRoute;
  arrangement: "INTERNAL" | "OUTSOURCED";
  stopType: "REST_STOP" | "BCP" | "DESTINATION";
  provider?: Provider;
  note?: string;
};

export function arrangementForRoute(
  route: MapRoute,
): "INTERNAL" | "OUTSOURCED" {
  return route.transportMode === "ROAD" ? "INTERNAL" : "OUTSOURCED";
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
                {segment.route.fromLocation?.name} <span className="text-slate-400">→</span> {segment.route.toLocation?.name}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <button type="button" onClick={onDelete} aria-label="Delete segment">
                  <Trash2 className="size-4" />
                </button>
                <MoreVertical className="size-4" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div><p className="text-muted-foreground">Distance</p><p className="font-semibold">{segment.route.distanceKm ?? "—"} km</p></div>
              <div><p className="text-muted-foreground">Estimated time</p><p className="font-semibold">{segment.route.durationMinutes ? `${Math.round(segment.route.durationMinutes / 60)}h ${segment.route.durationMinutes % 60}m` : "—"}</p></div>
              <div><p className="text-muted-foreground">Stop type</p><Badge variant="outline" className="mt-1 border-0 px-0">{segment.stopType.replace("_", " ")}</Badge></div>
              <div>
                <span className="text-muted-foreground">Arrangement</span>
                <div className="mt-1">
                  {canManageOutsource ? (
                    <OutsourceSegmentDialog routePlanId={routePlanId} routePlanRouteId={segment.route.routePlanRouteId ?? String(segment.route.id)} transportMode={segment.route.transportMode ?? "ROAD"} isOutsourced={segment.arrangement === "OUTSOURCED"} currentProvider={segment.provider} currentNote={segment.note} onChanged={onOutsource}>
                      <Button type="button" variant="ghost" className="h-auto p-0 font-semibold hover:bg-transparent">
                        {segment.arrangement === "OUTSOURCED" ? "Outsource" : "Internal"}
                      </Button>
                    </OutsourceSegmentDialog>
                  ) : <span className="font-semibold">{segment.arrangement === "OUTSOURCED" ? "Outsource" : "Internal"}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
