import { useMemo } from "react"
import { Link } from "react-router-dom"
import { MoreHorizontal } from "lucide-react"
import { createTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/shared/components/ui/data-table"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge"
import { formatPlanDate } from "@/features/transport-plan/format"
import { distanceLabel, durationLabel, replacementLabel } from "../display"
import { getPendingRouteActions, type RouteWorkspaceContext } from "../workspace-actions"
import type { RouteDetailPath, RoutePlanSummary } from "../types"
import { emergencyActionLabels, emergencyActionPath, getEmergencyActions } from "../emergency-policy"

export function RoutePlansTable({ routes, context, routeDetailPath, isLoading = false }: {
  routes: RoutePlanSummary[]; context: RouteWorkspaceContext; routeDetailPath?: RouteDetailPath; isLoading?: boolean
}) {
  const columns = useMemo<ColumnDef<RoutePlanSummary>[]>(() => [
    { accessorKey: "routeType", header: "Route Type", cell: ({ row }) => <ApprovedBookingBadge value={row.original.routeType} /> },
    { accessorKey: "routePlanCode", header: "Route Code", cell: ({ row }) => routeDetailPath ? <Link className="font-semibold text-primary hover:underline" to={routeDetailPath(row.original.routePlanId)}>{row.original.routePlanCode}</Link> : <span className="font-semibold">{row.original.routePlanCode}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <ApprovedBookingBadge value={row.original.status} /> },
    { accessorKey: "totalDistanceKm", header: "Distance", cell: ({ row }) => <div>{distanceLabel(row.original.totalDistanceKm)}{row.original.routeType === "BACKUP" && <span className="mt-0.5 block text-[10px] text-slate-500">Replacement only</span>}</div> },
    { accessorKey: "estimatedDurationMinutes", header: "Duration", cell: ({ row }) => durationLabel(row.original.estimatedDurationMinutes) },
    { accessorKey: "segmentCount", header: "Segments" },
    { id: "replaces", header: "Replaces Segments", cell: ({ row }) => replacementLabel(row.original) },
    { accessorKey: "isPersonnelComplete", header: "Personnel", cell: ({ row }) => <span className={row.original.isPersonnelComplete ? "text-emerald-700" : "text-slate-500"}>{row.original.isPersonnelComplete ? "Complete" : "Incomplete"}</span> },
    { accessorKey: "updatedAt", header: "Last Updated", cell: ({ row }) => formatPlanDate(row.original.updatedAt) },
    { id: "actions", header: "Actions", cell: ({ row }) => <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${row.original.routePlanCode}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-72">
        {routeDetailPath ? <DropdownMenuItem asChild><Link to={routeDetailPath(row.original.routePlanId)}>View Details</Link></DropdownMenuItem> : <DropdownMenuItem disabled title="Route detail navigation is not available yet.">View Details — unavailable</DropdownMenuItem>}
        {getPendingRouteActions(row.original, context).map(action => <DropdownMenuItem key={action.label} disabled title={action.reason} className="items-start"><span>{action.label}<span className="mt-1 block whitespace-normal text-[11px]">{action.reason}</span></span></DropdownMenuItem>)}
        {getEmergencyActions(row.original, context).map(action => routeDetailPath ? <DropdownMenuItem key={action} asChild><Link to={emergencyActionPath(routeDetailPath(row.original.routePlanId), action)}>{emergencyActionLabels[action]}</Link></DropdownMenuItem> : <DropdownMenuItem key={action} disabled title="Route detail registration is required.">{emergencyActionLabels[action]} — navigation pending</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu> },
  ], [context, routeDetailPath])
  const table = createTable({ data: routes, columns, getCoreRowModel: getCoreRowModel(), getRowId: row => row.routePlanId,
    defaultColumn: { enableSorting: false }, state: { columnPinning: {}, columnOrder: [], columnVisibility: {}, rowSelection: {} },
    onStateChange: () => {}, renderFallbackValue: null,
  })
  return <DataTable table={table} isLoading={isLoading} aria-label="Route plans" aria-busy={isLoading}
    className="min-w-0" containerClassName="min-w-0 overflow-x-auto" tableClassName="min-w-[980px]"
    headerClassName="bg-[#e9e6de]" headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
    rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60" cellClassName="h-11 px-2.5 py-2 text-xs"
    emptyMessage="No route plans have been created for this transport plan." />
}
