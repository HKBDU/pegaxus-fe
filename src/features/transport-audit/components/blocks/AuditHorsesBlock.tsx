import { HeartPulse } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditHorsesData } from "../../types";
import { BlockCard, CopyValue } from "./block-utils";
const stressVariant = (value: string) =>
  value === "CRITICAL"
    ? "destructive"
    : value === "HIGH"
      ? "secondary"
      : "outline";
export function AuditHorsesBlock({ data }: { data?: AuditHorsesData }) {
  const horses = data?.horses ?? [];
  return (
    <div className="space-y-4">
      <BlockCard title="Racehorses" empty={!horses.length}>
        {horses.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horse</TableHead>
                <TableHead>Microchip</TableHead>
                <TableHead>Passport</TableHead>
                <TableHead>Breed</TableHead>
                <TableHead>Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {horses.map((horse) => (
                <TableRow key={horse.horseId}>
                  <TableCell className="font-semibold">
                    {horse.horseName}
                  </TableCell>
                  <TableCell>
                    <CopyValue
                      value={horse.microchipNumber}
                      label={`Copy microchip ${horse.horseName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <CopyValue
                      value={horse.passportNumber}
                      label={`Copy passport ${horse.horseName}`}
                    />
                  </TableCell>
                  <TableCell>{horse.breed ?? "—"}</TableCell>
                  <TableCell>
                    {horse.weightKg ? `${horse.weightKg} kg` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
      <BlockCard
        title="Health & vital logs"
        empty={!horses.some((horse) => horse.healthLogs.length)}
      >
        {horses.flatMap((horse) =>
          horse.healthLogs.map((log) => (
            <div
              key={log.logId}
              className="flex flex-wrap items-center gap-3 border-b py-3 last:border-0"
            >
              <HeartPulse className="size-4 text-[#f39200]" />
              <span className="font-semibold">{horse.horseName}</span>
              <span className="text-xs text-slate-500">
                {log.recordedAt} · {log.locationName ?? "Unknown location"}
              </span>
              <span className="text-sm">
                {log.temperatureCelsius}°C / {log.heartRateBpm} bpm{" "}
                {log.respirationRate ? `/ ${log.respirationRate} rpm` : ""}
              </span>
              <Badge
                variant={
                  stressVariant(log.stressLevel) as
                    "default" | "secondary" | "destructive" | "outline"
                }
              >
                {log.stressLevel}
              </Badge>
              <span className="text-xs text-slate-500">
                {log.veterinarianName ?? "—"}
              </span>
            </div>
          )),
        )}
      </BlockCard>
    </div>
  );
}
