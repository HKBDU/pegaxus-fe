import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CircleDot, Route, TriangleAlert } from "lucide-react";
import {
  createTable,
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { DataTable } from "@/shared/components/ui/data-table";
import {
  DEFAULT_STATUS_FILTER,
  routeLabels,
  segmentLabels,
} from "../constants";
import { formatTransportDate } from "../format";
import { ongoingTransportDetailPath } from "../navigation";
import { ongoingTransportSortSchema } from "../schemas";
import type {
  OngoingTransport,
  OngoingTransportFilterPatch,
  OngoingTransportPage,
  OngoingTransportParams,
  OngoingListReturnState,
} from "../types";
import { OngoingTransportStatusBadge } from "./OngoingTransportStatusBadge";
import { OngoingTransportPagination } from "./OngoingTransportPagination";

const createColumns = (
  listState: OngoingListReturnState,
): ColumnDef<OngoingTransport>[] => [
  {
    accessorKey: "transportCode",
    header: "Transport",
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        data-progress-link
        to={ongoingTransportDetailPath(row.original.transportId)}
        state={{ ongoingTransportList: listState }}
        className="rounded-xs font-semibold tracking-wide text-slate-900 underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        {row.original.transportCode}
      </Link>
    ),
  },
  {
    accessorKey: "bookingCode",
    header: "Booking",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-slate-600">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ getValue }) => (
      <span className="block min-w-28 max-w-40 whitespace-normal font-medium">
        {getValue<string>()}
      </span>
    ),
  },
  {
    id: "currentSegment",
    header: "Current segment",
    cell: ({ row }) => {
      const segment = row.original.currentSegment;
      return segment ? (
        <div className="min-w-44 space-y-0.5">
          <span className="block whitespace-normal text-slate-800">
            {segment.fromLocationName}
            <span aria-hidden="true" className="px-1 text-slate-400">
              →
            </span>
            <span className="sr-only"> to </span>
            {segment.toLocationName}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <CircleDot aria-hidden="true" className="size-2.5" />
            Leg {segment.displayOrder} · {segmentLabels[segment.status]}
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-400">No current segment</span>
      );
    },
  },
  {
    accessorKey: "routeType",
    header: "Route",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="rounded-xs border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-600 motion-reduce:transition-none"
      >
        <Route aria-hidden="true" />
        {row.original.routeType ? routeLabels[row.original.routeType] : "—"}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <OngoingTransportStatusBadge status={row.original.status} />
    ),
  },
  {
    accessorKey: "horseCount",
    header: "Horses",
    cell: ({ row }) => (
      <span className="block text-center tabular-nums">
        {row.original.horseCount}
      </span>
    ),
  },
  {
    accessorKey: "activeIncidentCount",
    header: "Incidents",
    cell: ({ row }) =>
      row.original.activeIncidentCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-xs bg-orange-50 px-1.5 py-0.5 font-medium tabular-nums text-orange-800"
          aria-label={`${row.original.activeIncidentCount} active incidents`}
        >
          <TriangleAlert aria-hidden="true" className="size-3" />
          {row.original.activeIncidentCount} active
        </span>
      ) : (
        <span className="text-slate-400">0 active</span>
      ),
  },
  {
    accessorKey: "departureAt",
    header: "Departure",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums text-slate-600">
        {formatTransportDate(row.original.departureAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="icon" className="size-7 rounded-xs">
        <Link
          to={ongoingTransportDetailPath(row.original.transportId)}
          state={{ ongoingTransportList: listState }}
          aria-label={`View progress for ${row.original.transportCode}`}
        >
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    ),
  },
];

export function OngoingTransportTable({
  page,
  params,
  initialLoading,
  busy,
  filters,
  onChange,
  onPageChange,
  listState,
}: {
  page?: OngoingTransportPage;
  params: OngoingTransportParams;
  initialLoading: boolean;
  busy: boolean;
  filters: ReactNode;
  onChange: (patch: OngoingTransportFilterPatch) => void;
  onPageChange: (pageIndex: number) => void;
  listState: OngoingListReturnState;
}) {
  const navigate = useNavigate();
  const [sortId, direction] = params.sortBy.split(":");
  const sorting: SortingState = [{ id: sortId, desc: direction === "desc" }];
  const table = createTable<OngoingTransport>({
    data: page?.items ?? [],
    columns: createColumns(listState),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.transportId,
    defaultColumn: { enableSorting: false, enableHiding: false },
    state: {
      sorting,
      columnVisibility: {},
      columnOrder: [],
      columnPinning: {},
      rowPinning: {},
      columnFilters: [],
      globalFilter: undefined,
      grouping: [],
      expanded: {},
      rowSelection: {},
      pagination: { pageIndex: params.pageIndex, pageSize: params.pageSize },
      columnSizing: {},
      columnSizingInfo: {
        startOffset: null,
        startSize: null,
        deltaOffset: null,
        deltaPercentage: null,
        isResizingColumn: false,
        columnSizingStart: [],
      },
    },
    onStateChange: () => {},
    renderFallbackValue: null,
    manualSorting: true,
    manualPagination: true,
    pageCount: page?.totalPages ?? 0,
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const sort = next[0];
      // Transport code supports ascending only; never emit an unsupported server sort.
      const value =
        sort?.id === "transportCode"
          ? "transportCode:asc"
          : `departureAt:${sort?.desc ? "desc" : "asc"}`;
      onChange({ sortBy: ongoingTransportSortSchema.parse(value) });
    },
  });
  const totalPages = page?.totalPages ?? 0;
  const pageIndex = page?.pageIndex ?? params.pageIndex;
  const outOfRange = !busy && pageIndex > Math.max(0, totalPages - 1);
  const filtered = Boolean(
    params.search?.trim() ||
    params.hasActiveIncident ||
    params.status !== DEFAULT_STATUS_FILTER,
  );
  return (
    <DataTable
      table={table}
      isLoading={initialLoading}
      aria-busy={busy}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const target = event.target;
        // Shared DataTable has no row-click API. Leave controls/links native to avoid duplicate navigation.
        if (
          !(target instanceof Element) ||
          target.closest("a, button, input, select, textarea, [role=button]")
        )
          return;
        if (window.getSelection()?.toString()) return;
        const href = target
          .closest("tbody tr")
          ?.querySelector<HTMLAnchorElement>("a[data-progress-link]")
          ?.getAttribute("href");
        if (href)
          void navigate(href, { state: { ongoingTransportList: listState } });
      }}
      containerClassName="booking-panel overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      tableClassName="min-w-[1100px]"
      headerCellClassName="h-10 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-slate-600"
      rowClassName="booking-table-row cursor-pointer border-slate-200 hover:bg-primary/5 motion-reduce:transition-none"
      cellClassName="h-12 px-2.5 py-2 text-xs"
      emptyMessage={
        <div role="status" className="px-4 py-10">
          <Route
            aria-hidden="true"
            className="mx-auto mb-2 size-6 text-slate-300"
          />
          <p className="m-0 font-medium text-slate-700">
            {outOfRange
              ? "This page is no longer available"
              : filtered
                ? "No transports match your filters"
                : "No ongoing transports"}
          </p>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            {outOfRange
              ? "The transport list has changed. Return to the first page to continue."
              : filtered
                ? "Adjust your search or status selections."
                : "Transport journeys will appear here when available."}
          </p>
        </div>
      }
      footer={
        outOfRange ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit rounded-xs text-xs"
            onClick={() => onPageChange(0)}
          >
            Back to first page
          </Button>
        ) : (
          <OngoingTransportPagination
            busy={busy}
            meta={{
              currentPage: pageIndex + 1,
              itemsPerPage: page?.pageSize ?? params.pageSize,
              totalItems: page?.totalItems ?? 0,
              totalPages,
              hasPreviousPage: pageIndex > 0,
              hasNextPage: pageIndex + 1 < totalPages,
            }}
            onPageChange={(pageNumber) => {
              if (!busy && pageNumber > 0 && pageNumber <= totalPages)
                onPageChange(pageNumber - 1);
            }}
            onPageSizeChange={(pageSize) => {
              if (!busy) onChange({ pageSize });
            }}
          />
        )
      }
    >
      {filters}
    </DataTable>
  );
}
