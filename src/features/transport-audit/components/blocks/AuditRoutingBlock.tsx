import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditRoutingData } from "../../types";
import { BlockCard, ValueGrid } from "./block-utils";
import { formatAuditDateTime } from "../../utils";
export function AuditRoutingBlock({
  data,
  isManager,
}: {
  data?: AuditRoutingData;
  isManager?: boolean;
}) {
  const legs = data?.legs ?? [];
  return (
    <div className="space-y-4">
      <BlockCard title="Route summary" empty={!data}>
        <ValueGrid
          values={[
            ["Route plan", data?.routePlanCode],
            [
              "Distance",
              data?.totalDistanceKm ? `${data.totalDistanceKm} km` : undefined,
            ],
            [
              "Duration",
              data?.totalDurationHours
                ? `${data.totalDurationHours} hours`
                : undefined,
            ],
          ]}
        />
      </BlockCard>
      <BlockCard title="Route legs" empty={!legs.length}>
        {legs.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Leg</TableHead>
                <TableHead>Vehicle / driver</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Outsourcing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legs.map((leg) => (
                <TableRow key={leg.legId}>
                  <TableCell>{leg.legOrder}</TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {leg.fromLocation} → {leg.toLocation}
                    </div>
                    <Badge variant="outline">{leg.legType}</Badge>
                  </TableCell>
                  <TableCell>
                    {[leg.truckPlate, leg.trailerPlate, leg.driverName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    Plan: {formatAuditDateTime(leg.plannedDepartureAt)}
                    <br />
                    Actual: {formatAuditDateTime(leg.actualDepartureAt)}
                  </TableCell>
                  <TableCell>
                    {leg.isOutsourced ? (
                      <>
                        {leg.subcontractorName ?? "Subcontractor"}
                        {isManager && leg.outsourcingCost !== undefined
                          ? ` · ${leg.outsourcingCost} VND`
                          : ""}
                      </>
                    ) : (
                      "Internal"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
    </div>
  );
}
