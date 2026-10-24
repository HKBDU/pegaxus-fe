import { ArrowRight, Truck, Ship, TrainTrack } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditRoutingData } from "../../types";
import { BlockCard, ValueGrid, StatusPill, CopyValue } from "./block-utils";
import { formatAuditDateTime } from "../../utils";

export function AuditRoutingBlock({
  data,
  isManager,
}: {
  data?: AuditRoutingData;
  isManager?: boolean;
}) {
  const legs = data?.legs ?? [];

  const getLegTypeLabel = (type: string) => {
    switch (type) {
      case "ROAD_DOMESTIC":
        return { label: "Domestic Road", icon: Truck };
      case "FERRY":
        return { label: "Sea Ferry", icon: Ship };
      case "CHUNNEL":
        return { label: "Eurotunnel", icon: TrainTrack };
      case "ROAD_INTERNATIONAL":
        return { label: "Cross-Border Road", icon: Truck };
      default:
        return { label: type, icon: Truck };
    }
  };

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Route Execution Summary"
        empty={!data}
        headerExtra={
          data?.routePlanCode ? (
            <span className="font-mono text-xs text-slate-500">
              Plan: {data.routePlanCode}
            </span>
          ) : undefined
        }
      >
        <ValueGrid
          columns={4}
          values={[
            ["Route plan code", <CopyValue value={data?.routePlanCode} key="rcode" />],
            ["Total distance", data?.totalDistanceKm ? `${data.totalDistanceKm} km` : "Calculated via GPS"],
            ["Total duration", data?.totalDurationHours ? `${data.totalDurationHours} hrs` : "On schedule"],
            ["Transit segments", `${legs.length} Continuous Legs`],
          ]}
        />
      </BlockCard>

      <BlockCard
        title="Transit Legs & Resource Assignment"
        empty={!legs.length}
        headerExtra={
          <StatusPill status={`${legs.length} Segments`} tone="neutral" />
        }
      >
        {legs.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#fcfbf9]">
                <TableRow>
                  <TableHead className="w-12 text-xs">#</TableHead>
                  <TableHead className="text-xs">Transit Leg & Type</TableHead>
                  <TableHead className="text-xs">Vehicle & Driver</TableHead>
                  <TableHead className="text-xs">Planned vs Actual Departure</TableHead>
                  <TableHead className="text-xs">Execution Fleet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {legs.map((leg) => {
                  const { label: typeLabel, icon: LegIcon } = getLegTypeLabel(leg.legType);

                  return (
                    <TableRow key={leg.legId}>
                      <TableCell className="font-bold text-slate-700 text-xs">
                        {leg.legOrder}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          <span>{leg.fromLocation}</span>
                          <ArrowRight className="size-3 text-[#f39200] shrink-0" />
                          <span>{leg.toLocation}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <LegIcon className="size-3 text-slate-400" />
                          <span>{typeLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-800">
                          {leg.driverName || "Assigned Driver"}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          Truck: {leg.truckPlate || "—"} {leg.trailerPlate ? `• Trailer: ${leg.trailerPlate}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-400">Sched: </span>
                          {leg.plannedDepartureAt ? formatAuditDateTime(leg.plannedDepartureAt) : "—"}
                        </div>
                        <div className="mt-0.5 text-slate-900 font-medium">
                          <span className="font-semibold text-slate-400">Actual: </span>
                          {leg.actualDepartureAt ? formatAuditDateTime(leg.actualDepartureAt) : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {leg.isOutsourced ? (
                          <div>
                            <StatusPill status="Subcontractor" tone="warning" dot />
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {leg.subcontractorName || "Partner fleet"}
                              {isManager && leg.outsourcingCost !== undefined
                                ? ` · ${leg.outsourcingCost.toLocaleString()} VND`
                                : ""}
                            </p>
                          </div>
                        ) : (
                          <StatusPill status="Internal Pegaxus Fleet" tone="success" dot />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}

