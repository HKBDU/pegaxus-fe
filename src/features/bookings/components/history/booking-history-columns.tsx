import type { ColumnDef } from "@tanstack/react-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { BookingHistoryItem } from "../../schemas/booking-history.schema";
import {
  formatHistoryLabel,
  formatHistoryTimestamp,
} from "../../history-utils";
import { BookingStatusBadge } from "../BookingStatusBadge";

export const bookingHistoryColumns: ColumnDef<BookingHistoryItem>[] = [
  {
    accessorKey: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-semibold uppercase">
        {formatHistoryLabel(row.original.action)}
      </span>
    ),
  },
  {
    accessorKey: "previousStatus",
    header: "From status",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.previousStatus === null ? (
        "—"
      ) : (
        <span className="text-neutral-600">
          {formatHistoryLabel(row.original.previousStatus)}
        </span>
      ),
  },
  {
    accessorKey: "newStatus",
    header: "To status",
    enableSorting: false,
    cell: ({ row }) => <BookingStatusBadge status={row.original.newStatus} />,
  },
  {
    accessorKey: "reason",
    header: "Audit note",
    enableSorting: false,
    cell: ({ row }) => {
      const reason = row.original.reason?.trim();
      return reason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              tabIndex={0}
              className="min-w-[200px] max-w-[360px] cursor-help whitespace-normal break-words focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="line-clamp-2">{reason}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-h-64 max-w-xs overflow-y-auto whitespace-pre-wrap break-words">
            {reason}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="text-neutral-500">—</span>
      );
    },
  },
  {
    accessorKey: "changedBy",
    header: "Changed by",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="min-w-[150px] max-w-[210px] whitespace-normal break-words">
        <p className="text-xs font-semibold uppercase">
          {row.original.changedBy.fullName}
        </p>
        <p className="text-xs text-neutral-600 uppercase">
          {formatHistoryLabel(row.original.changedBy.role)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "changedAt",
    header: "Timestamp (UTC)",
    enableSorting: false,
    cell: ({ row }) => (
      <time
        dateTime={row.original.changedAt}
        className="font-mono text-sm tabular-nums"
      >
        {formatHistoryTimestamp(row.original.changedAt)}
      </time>
    ),
  },
];
