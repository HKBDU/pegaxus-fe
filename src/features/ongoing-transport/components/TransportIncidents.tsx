import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowRight, HeartPulse, Route, TriangleAlert, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { formatTransportDate, formatTransportLabel } from "../format";
import type { TransportOverview } from "../types";

type IncidentStatusValue = "REPORTED" | "PENDING" | "RESOLVED" | "CANCELLED";
/** An incident of the transport in any status: resolved and cancelled ones stay listed with their new status. */
type Incident = Omit<TransportOverview["activeIncidents"][number], "status"> & {
  status: IncidentStatusValue;
};
const statusTone: Record<IncidentStatusValue, string> = {
  REPORTED: "border-rose-100 bg-rose-50 text-rose-700",
  PENDING: "border-amber-100 bg-amber-50 text-amber-800",
  RESOLVED: "border-emerald-100 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
};
const isOpen = (incident: Incident) =>
  incident.status === "REPORTED" || incident.status === "PENDING";
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
      className={`rounded-xs text-[10px] ${statusTone[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {formatTransportLabel(status)}
    </Badge>
  );
}

function ViewIncident({ href, code }: { href: string; code: string }) {
  return (
    <Button asChild variant="outline" size="xs" className="rounded-xs">
      {/* The row opens the incident too: stop here so it does not navigate twice. */}
      <Link
        to={href}
        aria-label={`View incident ${code}`}
        onClick={(event) => event.stopPropagation()}
      >
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
  const columns = useMemo<ColumnDef<Incident>[]>(
    () => [
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => <IncidentCategory incident={row.original} />,
      },
      {
        id: "severity",
        header: "Severity",
        cell: ({ row }) => (
          <span className="font-medium text-slate-600">
            {row.original.severity ? formatTransportLabel(row.original.severity) : "—"}
          </span>
        ),
      },
      {
        id: "summary",
        header: "Summary",
        cell: ({ row }) => (
          <div className="min-w-52 max-w-md whitespace-normal">
            <p className="m-0 font-medium text-slate-800">{row.original.title}</p>
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {row.original.incidentCode}
            </span>
            {row.original.description ? (
              <p className="mt-1 mb-0 leading-relaxed whitespace-pre-wrap text-slate-500">
                {row.original.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "occurredAt",
        header: "Reported at",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-slate-500">
            {formatTransportDate(row.original.occurredAt)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <IncidentStatus status={row.original.status} />,
      },
      {
        id: "details",
        header: () => <span className="block text-right">Details</span>,
        cell: ({ row }) => {
          const href = detailHref?.(row.original);
          return href ? (
            <div className="flex justify-end">
              <ViewIncident href={href} code={row.original.incidentCode} />
            </div>
          ) : null;
        },
      },
    ],
    [detailHref],
  );
  const table = useReactTable({
    data: incidents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (incident) => incident.incidentReportId,
    state: { columnVisibility: { severity: showSeverity, details: hasLinks } },
  });
  /**
   * The whole phone card opens the incident, not only its button. Clicks on the card's own links and buttons are left to
   * them, so the button does not navigate twice. Enter and Space open it from the keyboard.
   */
  const cardProps = (incident: Incident) => {
    const href = detailHref?.(incident);
    if (!href) return {};
    const openIncident = () => navigate(href);
    return {
      role: "link" as const,
      tabIndex: 0,
      "aria-label": `Open incident ${incident.incidentCode}`,
      className:
        "cursor-pointer transition-colors hover:bg-orange-50/40 focus-visible:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
      onClick: (event: MouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("a, button")) return;
        openIncident();
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openIncident();
        }
      },
    };
  };
  if (incidents.length === 0) return null;
  const open = incidents.filter(isOpen).length;
  return (
    <section
      aria-labelledby="transport-incidents"
      className="overview-panel overflow-hidden"
    >
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${open ? "border-rose-100 bg-rose-50/60" : "border-slate-200 bg-slate-50/60"}`}
      >
        <h2
          id="transport-incidents"
          className={`overview-heading ${open ? "!text-rose-700" : "!text-slate-700"}`}
        >
          <TriangleAlert aria-hidden="true" />
          Incidents
        </h2>
        <Badge
          variant="outline"
          className={`rounded-xs bg-white text-[11px] ${open ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-600"}`}
        >
          {open ? `${open} active · ${incidents.length} total` : `${incidents.length} total`}
        </Badge>
      </div>
      <DataTable
        table={table}
        className="hidden md:flex"
        containerClassName="rounded-none border-0 overflow-x-auto"
        rowClassName="align-top hover:bg-orange-50/40"
        emptyMessage="No incidents."
        onRowClick={(row) => {
          const href = detailHref?.(row.original);
          if (href) navigate(href);
        }}
      />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0 md:hidden">
        {incidents.map((incident) => (
          <li
            key={incident.incidentReportId}
            {...cardProps(incident)}
            className={`space-y-2 px-4 py-3 ${cardProps(incident).className ?? ""}`}
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
