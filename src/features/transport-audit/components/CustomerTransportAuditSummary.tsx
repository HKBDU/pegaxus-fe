import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DownloadEpodButton } from "./DownloadEpodButton";
import { useTransportAudit } from "../hooks/useTransportAudit";
import { formatAuditDateTime } from "../utils";
import type { TransportAuditCustomer } from "../types";
export function CustomerTransportAuditSummary({
  bookingId,
  audit,
  transportId,
}: {
  bookingId: string;
  audit?: TransportAuditCustomer;
  transportId?: string;
}) {
  const query = useTransportAudit(
    String(transportId ?? audit?.transportId ?? ""),
    "booking,operations,timeline",
  );
  const current = query.data ?? audit;
  const fallback = (current ?? {
    transportId: transportId ?? "",
    transportCode: "Completed transport",
    status: "COMPLETED",
    timeline: [],
  }) as TransportAuditCustomer;
  return (
    <Card className="gap-0 rounded-[2px] border-[#d9d3c7] bg-white py-0 shadow-[0_3px_12px_rgba(23,25,28,0.06)]">
      <CardHeader className="border-b border-[#ece7dd] bg-[#fbfaf7] px-5 py-4">
        <CardTitle>Completed transport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">{fallback.transportCode}</span>
          <Badge>{fallback.status}</Badge>
          {fallback.completedAt ? (
            <span className="text-sm text-slate-500">
              {formatAuditDateTime(fallback.completedAt)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link
              to={`/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(String(fallback.transportId))}/history`}
            >
              View transport history
            </Link>
          </Button>
          <DownloadEpodButton
            handoverRecordId={
              fallback.epod?.handoverRecordId
                ? String(fallback.epod.handoverRecordId)
                : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
