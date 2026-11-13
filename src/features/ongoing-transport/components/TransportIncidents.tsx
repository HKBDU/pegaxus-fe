import type { KeyboardEvent, MouseEvent } from "react";
import { ArrowRight, HeartPulse, Route, TriangleAlert, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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

function ViewIncident({ href, code }: { href: string; code: string }) {
  return (
    <Button asChild variant="outline" size="xs" className="rounded-xs">
      <Link to={href} aria-label={`View incident ${code}`}>
        View details
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

export function TransportIncidents({
  incidents,
  detailHref,
}: {
  incidents: Incident[];
  /**
   * Where an incident opens, or null when the viewer cannot read it. Without it the panel was read-only, so the crew had
   * no way from here to the detail page where they resolve, cancel or raise the severity of the incident.
   */
  detailHref?: (incident: Incident) => string | null;
}) {
  const navigate = useNavigate();
  const showSeverity = incidents.some(
    (incident) => incident.severity !== undefined,
  );
  const hasLinks = Boolean(detailHref) && incidents.some((incident) => detailHref?.(incident));
  /**
   * The whole row (or phone card) opens the incident, not only its button. Clicks on the row's own links and buttons are
   * left to them, so the button does not navigate twice. Enter and Space open it from the keyboard.
   */
  const rowProps = (incident: Incident) => {
    const href = detailHref?.(incident);
    if (!href) return {};
    const open = () => navigate(href);
    return {
      role: "link" as const,
      tabIndex: 0,
      "aria-label": `Open incident ${incident.incidentCode}`,
      className:
        "cursor-pointer transition-colors hover:bg-orange-50/40 focus-visible:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
      onClick: (event: MouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("a, button")) return;
        open();
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      },
    };
  };
  if (incidents.length === 0) return null;
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
              {hasLinks ? <TableHead className="text-right">Details</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow
                key={incident.incidentReportId}
                {...rowProps(incident)}
                className={`hover:bg-orange-50/30 ${rowProps(incident).className ?? ""}`}
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
                {hasLinks ? (
                  <TableCell className="text-right">
                    {detailHref?.(incident) ? (
                      <ViewIncident href={detailHref(incident)!} code={incident.incidentCode} />
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="m-0 list-none divide-y divide-slate-100 p-0 md:hidden">
        {incidents.map((incident) => (
          <li
            key={incident.incidentReportId}
            {...rowProps(incident)}
            className={`space-y-2 px-4 py-3 ${rowProps(incident).className ?? ""}`}
          >
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
            {detailHref?.(incident) ? (
              <div className="flex justify-end">
                <ViewIncident href={detailHref(incident)!} code={incident.incidentCode} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
