import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditBookingData } from "../../types";
import { BlockCard, ValueGrid, StatusPill, CopyValue } from "./block-utils";

export function AuditBookingBlock({ data }: { data?: AuditBookingData }) {
  if (!data) return <BlockCard title="Booking & Customer" empty />;

  const getClaimTone = (status: string) => {
    if (status === "RESOLVED") return "success";
    if (status === "PENDING" || status === "IN_REVIEW") return "warning";
    return "danger";
  };

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Booking & Client Profile"
        headerExtra={
          <span className="font-mono text-xs text-slate-500">
            ID: {data.bookingId.slice(-8)}
          </span>
        }
      >
        <ValueGrid
          columns={4}
          values={[
            ["Booking code", <CopyValue value={data.bookingCode} key="bcode" />],
            ["Client name", data.customer.name],
            ["Origin Country", data.originCountry],
            ["Destination Country", data.destinationCountry],
          ]}
        />
      </BlockCard>

      <BlockCard
        title="Disputes & Claims Record"
        empty={!data.claims?.length}
        headerExtra={
          data.claims?.length ? (
            <StatusPill
              status={`${data.claims.length} Claims filed`}
              tone={data.claims.some((c) => c.status !== "RESOLVED") ? "warning" : "success"}
              dot
            />
          ) : (
            <StatusPill status="0 Claims filed (Clear)" tone="success" dot />
          )
        }
      >
        {data.claims?.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#fcfbf9]">
                <TableRow>
                  <TableHead className="text-xs">Claim Code</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.claims.map((claim) => (
                  <TableRow key={claim.claimId}>
                    <TableCell>
                      <CopyValue value={claim.claimCode} />
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        status={claim.status}
                        tone={getClaimTone(claim.status)}
                        dot
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}

