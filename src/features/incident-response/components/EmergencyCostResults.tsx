import { CostStatusBadge, VndText } from "@/shared/components/incident";
import { EmptyState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
import type { EmergencyCostListItem } from "../schemas";
import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";

const dates = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const formatDate = (value: string) => dates.format(new Date(value));

export function EmergencyCostResults({ items, loading, busy, detailPath }: {
  items: EmergencyCostListItem[];
  loading: boolean;
  busy: boolean;
  detailPath?: (item: EmergencyCostListItem) => string;
}) {
  const navigate = useNavigate();
  const openRow = (event: MouseEvent<HTMLElement>, item: EmergencyCostListItem) => {
    if (!detailPath || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      (event.target instanceof Element && event.target.closest("a,button,input,select,textarea")) || window.getSelection()?.toString()) return;
    navigate(detailPath(item));
  };
  if (loading) return (
    <div role="status" aria-label="Loading emergency cost requests" className="space-y-3 p-4">
      <span className="sr-only">Loading emergency cost requests...</span>
      {[1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-14 w-full rounded-xs" />)}
    </div>
  );
  if (items.length === 0) return <EmptyState message="No emergency cost requests match these filters." />;
  return (
    <div aria-busy={busy}>
      <div className="hidden p-1 lg:block">
        <Table className="text-xs">
          <caption className="sr-only">Read-only emergency cost requests. Dates use your local timezone.</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead><TableHead>Incident / Transport</TableHead>
              <TableHead>Category</TableHead><TableHead className="text-right">Requested</TableHead>
              <TableHead className="text-right">Approved</TableHead><TableHead>Status</TableHead>
              <TableHead>Requested at</TableHead><TableHead>Requested by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.emergencyCostRequestId} className={detailPath ? "cursor-pointer" : undefined} onClick={(event) => openRow(event, item)}>
                <TableCell className="font-semibold">{detailPath ? <Link className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2" to={detailPath(item)}>{item.requestCode}</Link> : item.requestCode}</TableCell>
                <TableCell><span className="block">{item.incident.incidentCode}</span><span className="text-muted-foreground">{item.transportCode}</span></TableCell>
                <TableCell className="max-w-40 whitespace-normal">{EMERGENCY_COST_CATEGORY_LABELS[item.category]}</TableCell>
                <TableCell className="text-right tabular-nums"><VndText amount={item.requestedAmount} /></TableCell>
                <TableCell className="text-right tabular-nums">{item.approvedAmount === null ? "—" : <VndText amount={item.approvedAmount} />}</TableCell>
                <TableCell><CostStatusBadge status={item.status} /></TableCell>
                <TableCell><time dateTime={item.requestedAt}>{formatDate(item.requestedAt)}</time></TableCell>
                <TableCell className="max-w-40 whitespace-normal break-words">{item.requestedBy?.fullName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label="Emergency cost requests" className="m-0 grid min-w-0 list-none divide-y divide-border p-0 lg:hidden">
        {items.map((item) => (
          <li key={item.emergencyCostRequestId} className={`min-w-0 space-y-2 p-3 ${detailPath ? "cursor-pointer" : ""}`} onClick={(event) => openRow(event, item)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-semibold">{detailPath ? <Link className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2" to={detailPath(item)}>{item.requestCode}</Link> : item.requestCode}</span>
              <CostStatusBadge status={item.status} />
            </div>
            <p className="m-0 text-xs text-muted-foreground">{EMERGENCY_COST_CATEGORY_LABELS[item.category]}</p>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:break-words [&_dt]:text-muted-foreground">
              <dt>Incident</dt><dd>{item.incident.incidentCode}</dd>
              <dt>Transport</dt><dd>{item.transportCode}</dd>
              <dt>Requested</dt><dd className="font-medium tabular-nums"><VndText amount={item.requestedAmount} /></dd>
              <dt>Approved</dt><dd className="tabular-nums">{item.approvedAmount === null ? "—" : <VndText amount={item.approvedAmount} />}</dd>
              <dt>Requested at</dt><dd><time dateTime={item.requestedAt}>{formatDate(item.requestedAt)}</time></dd>
              <dt>Requested by</dt><dd>{item.requestedBy?.fullName ?? "—"}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
