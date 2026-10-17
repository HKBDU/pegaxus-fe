import {
  CircleCheck,
  HeartPulse,
  Route,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatTransportDate, formatTransportLabel } from "../format";
import type { TransportOverview } from "../types";

type Incident = TransportOverview["activeIncidents"][number];
const categories = {
  HORSE_HEALTH: { label: "Horse health", icon: HeartPulse },
  ROUTE_CHANGE: { label: "Route change", icon: Route },
  VEHICLE: { label: "Vehicle", icon: Truck },
  BOTH: { label: "Vehicle & horse health", icon: TriangleAlert },
};

function IncidentCategory({ incident }: { incident: Incident }) {
  const { label, icon: Icon } = categories[incident.category];
  return (
    <Badge
      variant="outline"
      className="rounded-xs border-orange-100 bg-orange-50 text-[10px] text-orange-800"
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
function IncidentStatus({ status }: { status: Incident["status"] }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-xs text-[10px] ${status === "REPORTED" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {formatTransportLabel(status)}
    </Badge>
  );
}

export function TransportIncidents({ incidents }: { incidents: Incident[] }) {
  const showSeverity = incidents.some(
    (incident) => incident.severity !== undefined,
  );
  if (incidents.length === 0)
    return (
      <section
        aria-label="Active incidents"
        role="status"
        className="flex items-start gap-2 rounded-xs border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      >
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Hành trình an toàn, không có sự cố ghi nhận.
      </section>
    );
  return (
    <section
      aria-labelledby="active-incidents"
      className="overview-panel overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50/60 px-4 py-3">
        <h2 id="active-incidents" className="overview-heading !text-rose-700">
          <TriangleAlert aria-hidden="true" />
          Active incidents
        </h2>
        <Badge
          variant="outline"
          className="rounded-xs border-rose-200 bg-white text-[11px] text-rose-700"
        >
          {incidents.length} active
        </Badge>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Category</TableHead>
              {showSeverity ? <TableHead>Severity</TableHead> : null}
              <TableHead>Summary</TableHead>
              <TableHead>Reported at</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow
                key={incident.incidentReportId}
                className="hover:bg-orange-50/30"
              >
                <TableCell>
                  <IncidentCategory incident={incident} />
                </TableCell>
                {showSeverity ? (
                  <TableCell className="text-xs font-medium text-slate-600">
                    {incident.severity
                      ? formatTransportLabel(incident.severity)
                      : "—"}
                  </TableCell>
                ) : null}
                <TableCell className="min-w-52 max-w-md whitespace-normal">
                  <p className="m-0 text-xs font-medium text-slate-800">
                    {incident.title}
                  </p>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {incident.incidentCode}
                  </span>
                  {incident.description ? (
                    <p className="mt-1 mb-0 text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                      {incident.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs tabular-nums text-slate-500">
                  {formatTransportDate(incident.occurredAt)}
                </TableCell>
                <TableCell>
                  <IncidentStatus status={incident.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="m-0 list-none divide-y divide-slate-100 p-0 md:hidden">
        {incidents.map((incident) => (
          <li key={incident.incidentReportId} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <IncidentCategory incident={incident} />
              <IncidentStatus status={incident.status} />
            </div>
            <p className="m-0 text-sm font-medium text-slate-800">
              {incident.title}
            </p>
            {incident.description ? (
              <p className="m-0 text-xs leading-relaxed whitespace-pre-wrap text-slate-500">
                {incident.description}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-between gap-1 text-[11px] text-slate-500">
              <span>
                {incident.incidentCode}
                {incident.severity
                  ? ` · ${formatTransportLabel(incident.severity)}`
                  : ""}
              </span>
              <time dateTime={incident.occurredAt}>
                {formatTransportDate(incident.occurredAt)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
