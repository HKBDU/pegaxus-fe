import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState, TablePagination } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { transportAudit } from "@/app/route-config";
import type { PaginationMeta } from "@/shared/types";
import type { TransportArchiveItem, TransportArchiveQuery } from "../types";
import { formatAuditDateTime } from "../utils";
export function TransportArchiveTable({
  items,
  meta,
  loading,
  onPageChange,
  onPageSizeChange,
  archiveParams,
}: {
  items: TransportArchiveItem[];
  meta: PaginationMeta;
  loading?: boolean;
  onPageChange: (p: number) => void;
  onPageSizeChange: (p: number) => void;
  archiveParams?: TransportArchiveQuery;
}) {
  const location = useLocation();
  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="No completed transports found." />
      ) : (
        <div className="overflow-x-auto border border-[#e5e2d9] bg-white">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-[#e9e6de]">
              <TableRow>
                <TableHead>Transport</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Horses</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={String(item.transportId)}>
                  <TableCell className="font-semibold">
                    {item.transportCode}
                  </TableCell>
                  <TableCell>{item.bookingCode ?? "—"}</TableCell>
                  <TableCell>{item.customerName ?? "—"}</TableCell>
                  <TableCell>{item.horseCount ?? 0}</TableCell>
                  <TableCell>{formatAuditDateTime(item.completedAt)}</TableCell>
                  <TableCell>
                    <Badge>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="text-xs font-semibold text-primary underline"
                      to={transportAudit(String(item.transportId))}
                      state={{
                        transportArchiveList: archiveParams,
                        from: location.pathname + location.search,
                      }}
                    >
                      View audit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <TablePagination
        meta={meta}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeAriaLabel="Archive page size"
      />
    </div>
  );
}
