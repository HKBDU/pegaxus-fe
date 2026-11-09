import { ArrowRight, Plane, Ship, Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditRoutePlan, AuditRoutingData } from "../../types";
import { BlockCard, CopyValue, StatusPill, ValueGrid, humanize } from "./block-utils";
import { formatAuditDateTime } from "../../utils";

const MODE_ICONS = { ROAD: Truck, SEA: Ship, AIR: Plane } as const;

const PLAN_STATUS_TONES: Record<string, "success" | "info" | "danger" | "neutral"> = {
  COMPLETED: "success",
  CONFIRMED: "info",
  IN_PROGRESS: "info",
  CANCELLED: "danger",
  REJECTED: "danger",
};

function formatDuration(minutes?: number | null) {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatCost(amount?: number | null, currency?: string | null) {
  return amount == null ? null : `${amount.toLocaleString()} ${currency ?? "VND"}`;
}

function PlanSummary({ plan }: { plan: AuditRoutePlan }) {
  return (
    <ValueGrid
      columns={4}
      values={[
        ["Route plan code", <CopyValue value={plan.routePlanCode} key="code" />],
        [
          "Total distance",
          plan.totalDistanceKm == null ? "—" : `${plan.totalDistanceKm} km`,
        ],
        ["Estimated duration", formatDuration(plan.estimatedDurationMinutes)],
        [
          "Segments",
          `${plan.segments.length} ${plan.segments.length === 1 ? "segment" : "segments"}`,
        ],
      ]}
    />
  );
}

function SegmentsTable({
  plan,
  isManager,
}: {
  plan: AuditRoutePlan;
  isManager?: boolean;
}) {
  if (!plan.segments.length) {
    return (
      <p className="py-3 text-center text-xs text-slate-500">
        No segments recorded for this route plan.
      </p>
    );
  }

  const segments = [...plan.segments].sort((a, b) => a.sequenceNo - b.sequenceNo);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-[#fcfbf9]">
          <TableRow>
            <TableHead className="w-12 text-xs">#</TableHead>
            <TableHead className="text-xs">Segment & Mode</TableHead>
            <TableHead className="text-xs">Vehicle & Crew</TableHead>
            <TableHead className="text-xs">Departure (Planned / Actual)</TableHead>
            <TableHead className="text-xs">Arrival (Planned / Actual)</TableHead>
            <TableHead className="text-xs">Execution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segments.map((segment) => {
            const ModeIcon =
              MODE_ICONS[segment.transportMode as keyof typeof MODE_ICONS] ?? Truck;
            const isOutsourced = segment.executedBy === "OUTSOURCED";
            const cost = formatCost(segment.outsourcingCost, segment.outsourcingCurrency);
            const vehicle = [segment.vehicleCode, segment.licensePlate]
              .filter(Boolean)
              .join(" · ");

            return (
              <TableRow
                key={segment.routePlanRouteId}
                className={segment.supersededAt ? "opacity-60" : undefined}
              >
                <TableCell className="font-bold text-slate-700 text-xs">
                  {segment.sequenceNo}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <span>{segment.from}</span>
                    <ArrowRight className="size-3 text-[#f39200] shrink-0" />
                    <span>{segment.to}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <ModeIcon className="size-3 text-slate-400" />
                    <span>{humanize(segment.transportMode)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{humanize(segment.status)}</span>
                    {segment.supersededAt ? (
                      <StatusPill tone="neutral">
                        Superseded {formatAuditDateTime(segment.supersededAt)}
                      </StatusPill>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium text-slate-800">
                    Driver: {segment.driverName ?? "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-600">
                    Escort: {segment.escortName ?? "—"}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                    Vehicle: {vehicle || "—"}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-400">Plan: </span>
                    {formatAuditDateTime(segment.plannedDepartureAt)}
                  </div>
                  <div className="mt-0.5 font-medium text-slate-900">
                    <span className="font-semibold text-slate-400">Actual: </span>
                    {formatAuditDateTime(segment.actualDepartureAt)}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-400">Plan: </span>
                    {formatAuditDateTime(segment.plannedArrivalAt)}
                  </div>
                  <div className="mt-0.5 font-medium text-slate-900">
                    <span className="font-semibold text-slate-400">Actual: </span>
                    {formatAuditDateTime(segment.actualArrivalAt)}
                  </div>
                </TableCell>
                <TableCell>
                  {isOutsourced ? (
                    <div>
                      <StatusPill status="Outsourced" tone="warning" dot />
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {segment.providerName ?? "—"}
                        {isManager && cost ? ` · ${cost}` : ""}
                      </p>
                    </div>
                  ) : (
                    <StatusPill status="Internal fleet" tone="success" dot />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PlanStatus({ status }: { status: string }) {
  return (
    <StatusPill tone={PLAN_STATUS_TONES[status] ?? "neutral"} dot>
      {humanize(status)}
    </StatusPill>
  );
}

export function AuditRoutingBlock({
  data,
  isManager,
}: {
  data?: AuditRoutingData;
  isManager?: boolean;
}) {
  const primary = data?.primary;
  const alternatives = data?.alternatives ?? [];

  if (!primary && !alternatives.length) {
    return <BlockCard title="Route Execution Summary" empty />;
  }

  return (
    <div className="space-y-3.5">
      {primary ? (
        <>
          <BlockCard
            title="Route Execution Summary"
            headerExtra={<PlanStatus status={primary.status} />}
          >
            <PlanSummary plan={primary} />
          </BlockCard>
          <BlockCard
            title="Executed Segments & Resource Assignment"
            headerExtra={
              <StatusPill
                status={`${primary.segments.length} ${primary.segments.length === 1 ? "Segment" : "Segments"}`}
                tone="neutral"
              />
            }
          >
            <SegmentsTable plan={primary} isManager={isManager} />
          </BlockCard>
        </>
      ) : (
        <BlockCard title="Route Execution Summary">
          <p className="py-3 text-center text-xs text-slate-500">
            No primary route plan was recorded for this transport.
          </p>
        </BlockCard>
      )}

      {alternatives.map((plan) => (
        <BlockCard
          key={plan.routePlanId}
          title={`Alternative Route Plan · ${plan.routePlanCode}`}
          headerExtra={<PlanStatus status={plan.status} />}
        >
          <div className="space-y-3">
            <PlanSummary plan={plan} />
            <SegmentsTable plan={plan} isManager={isManager} />
          </div>
        </BlockCard>
      ))}
    </div>
  );
}
