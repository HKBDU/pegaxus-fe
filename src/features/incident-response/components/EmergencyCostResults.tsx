import { CostStatusBadge, VndText } from "@/shared/components/incident";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
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
import { useRef, type MouseEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

function RequestActions({
  item,
  href,
  onOpen,
}: {
  item: EmergencyCostListItem;
  href: string;
  onOpen?: (item: EmergencyCostListItem) => void;
}) {
  const openingDetail = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu modal={!onOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-[2px] lg:size-7"
            aria-label={`Actions for ${item.requestCode}`}
          >
            <MoreHorizontal aria-hidden="true" className="size-4 lg:size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (openingDetail.current) {
              event.preventDefault();
              openingDetail.current = false;
            }
          }}
        >
          {onOpen ? (
            <DropdownMenuItem
              onSelect={() => {
                openingDetail.current = true;
                // Keep a mounted return-focus target for the embedded detail dialog.
                trigger.current?.focus();
                onOpen(item);
              }}
            >
              View details
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link to={href}>View details</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
                    <DateTimeUtc value={item.requestedAt} compact />
                  </time>
                </TableCell>
                {detailPath ? (
                  <TableCell className="w-16 text-center">
                    <RequestActions
                      item={item}
                      href={detailPath(item)}
                      onOpen={onOpen}
                    />
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
              <div className="flex shrink-0 items-center gap-1">
                <CostStatusBadge status={item.status} />
                {detailPath && (
                  <RequestActions
                    item={item}
                    href={detailPath(item)}
                    onOpen={onOpen}
                  />
                )}
              </div>
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
                  <DateTimeUtc value={item.requestedAt} compact />
                </time>
              </dd>
              <dt>Requested by</dt>
              <dd>{item.requestedBy?.fullName ?? "—"}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
