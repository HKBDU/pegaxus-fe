import { CostStatusBadge, VndText } from "@/shared/components/incident";
import { EmptyState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
import type { EmergencyCostListItem } from "../schemas";
import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

const dates = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const formatDate = (value: string) => dates.format(new Date(value));

export function EmergencyCostResults({
  items,
  loading,
  busy,
  detailPath,
  onOpen,
}: {
  items: EmergencyCostListItem[];
  loading: boolean;
  busy: boolean;
  detailPath?: (item: EmergencyCostListItem) => string;
  onOpen?: (item: EmergencyCostListItem) => void;
}) {
  const navigate = useNavigate();
  const openRow = (
    event: MouseEvent<HTMLElement>,
    item: EmergencyCostListItem,
  ) => {
    if (
      !detailPath ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      (event.target instanceof Element &&
        event.target.closest("a,button,input,select,textarea")) ||
      window.getSelection()?.toString()
    )
      return;
    if (onOpen) onOpen(item);
    else navigate(detailPath(item));
  };
  const openLink = (
    event: MouseEvent<HTMLElement>,
    item: EmergencyCostListItem,
  ) => {
    if (
      !onOpen ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    onOpen(item);
  };
  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading emergency cost requests"
        className="space-y-3 p-4"
      >
        <span className="sr-only">Loading emergency cost requests...</span>
        {[1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} className="h-11 w-full rounded-[2px]" />
        ))}
      </div>
    );
  if (items.length === 0)
    return (
      <EmptyState message="No emergency cost requests match these filters." />
    );
  return (
    <div aria-busy={busy}>
      <div className="hidden min-w-0 max-w-full overflow-hidden rounded-[2px] lg:block">
        <Table className="text-xs">
          <caption className="sr-only">
            Read-only emergency cost requests. Dates use your local timezone.
          </caption>
          <TableHeader className="bg-[#e9e6de] dark:bg-muted [&_th]:h-11 [&_th]:px-2.5 [&_th]:font-heading [&_th]:text-[11px] [&_th]:font-medium [&_th]:tracking-[0.06em] [&_th]:text-gray-600 [&_th]:uppercase dark:[&_th]:text-foreground">
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Incident / Transport</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Requested</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Requested at</TableHead>
              {detailPath ? (
                <TableHead className="w-16 text-center">Action</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow
                key={item.emergencyCostRequestId}
                className={`${detailPath ? "cursor-pointer" : ""} border-border hover:bg-primary/5 ${index % 2 ? "bg-[#f7f6f3] dark:bg-muted/40" : "bg-card"} [&>td]:h-11 [&>td]:px-2.5 [&>td]:py-1.5 [&>td]:text-xs`}
                onClick={(event) => openRow(event, item)}
              >
                <TableCell className="font-semibold">
                  {detailPath ? (
                    <Link
                      className="inline-flex min-h-7 items-center text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
                      to={detailPath(item)}
                      onClick={(event) => openLink(event, item)}
                    >
                      {item.requestCode}
                    </Link>
                  ) : (
                    item.requestCode
                  )}
                </TableCell>
                <TableCell>
                  <span className="block">{item.incident.incidentCode}</span>
                  <span className="text-muted-foreground">
                    {item.transportCode}
                  </span>
                </TableCell>
                <TableCell className="max-w-40 whitespace-normal">
                  {EMERGENCY_COST_CATEGORY_LABELS[item.category]}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <VndText amount={item.requestedAmount} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.approvedAmount === null ? (
                    "—"
                  ) : (
                    <VndText amount={item.approvedAmount} />
                  )}
                </TableCell>
                <TableCell>
                  <CostStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="max-w-40 whitespace-normal break-words">
                  {item.requestedBy?.fullName ?? "—"}
                </TableCell>
                <TableCell>
                  <time dateTime={item.requestedAt}>
                    {formatDate(item.requestedAt)}
                  </time>
                </TableCell>
                {detailPath ? (
                  <TableCell className="w-16 text-center">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-[2px]"
                    >
                      <Link
                        to={detailPath(item)}
                        onClick={(event) => openLink(event, item)}
                        aria-label={`View ${item.requestCode}`}
                      >
                        <Eye aria-hidden className="size-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul
        aria-label="Emergency cost requests"
        className="m-0 grid min-w-0 list-none divide-y divide-border p-0 lg:hidden"
      >
        {items.map((item) => (
          <li
            key={item.emergencyCostRequestId}
            className={`min-w-0 space-y-2 p-3 ${detailPath ? "cursor-pointer" : ""}`}
            onClick={(event) => openRow(event, item)}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-semibold">
                {detailPath ? (
                  <Link
                    className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
                    to={detailPath(item)}
                    onClick={(event) => openLink(event, item)}
                  >
                    {item.requestCode}
                  </Link>
                ) : (
                  item.requestCode
                )}
              </span>
              <CostStatusBadge status={item.status} />
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              {EMERGENCY_COST_CATEGORY_LABELS[item.category]}
            </p>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:break-words [&_dt]:text-muted-foreground">
              <dt>Incident</dt>
              <dd>{item.incident.incidentCode}</dd>
              <dt>Transport</dt>
              <dd>{item.transportCode}</dd>
              <dt>Requested</dt>
              <dd className="font-medium tabular-nums">
                <VndText amount={item.requestedAmount} />
              </dd>
              <dt>Approved</dt>
              <dd className="tabular-nums">
                {item.approvedAmount === null ? (
                  "—"
                ) : (
                  <VndText amount={item.approvedAmount} />
                )}
              </dd>
              <dt>Requested at</dt>
              <dd>
                <time dateTime={item.requestedAt}>
                  {formatDate(item.requestedAt)}
                </time>
              </dd>
              <dt>Requested by</dt>
              <dd>{item.requestedBy?.fullName ?? "—"}</dd>
            </dl>
            {detailPath ? (
              <Button
                asChild
                variant="outline"
                className="min-h-11 w-full rounded-[2px] text-xs"
              >
                <Link
                  to={detailPath(item)}
                  onClick={(event) => openLink(event, item)}
                >
                  <Eye aria-hidden className="size-3.5" />
                  View details
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
