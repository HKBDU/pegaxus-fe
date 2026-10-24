import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditBookingData } from "../../types";
import { BlockCard, ValueGrid } from "./block-utils";
import { formatAuditDateTime } from "../../utils";
export function AuditBookingBlock({ data }: { data?: AuditBookingData }) {
  if (!data) return <BlockCard title="Booking" empty />;
  return (
    <div className="space-y-4">
      <BlockCard title="Booking & customer">
        <ValueGrid
          values={[
            ["Booking code", data.bookingCode],
            ["Customer", data.customer.name],
            ["Email", data.customer.email],
            ["Phone", data.customer.phone],
            ["Contract", data.contractNumber],
            [
              "Contract signed",
              data.contractSignedAt
                ? formatAuditDateTime(data.contractSignedAt)
                : undefined,
            ],
            ["Origin", data.originCountry],
            ["Destination", data.destinationCountry],
          ]}
        />
      </BlockCard>
      <BlockCard title="Claims" empty={!data.claims?.length}>
        {data.claims?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.claims.map((claim) => (
                <TableRow key={claim.claimId}>
                  <TableCell className="font-mono">{claim.claimCode}</TableCell>
                  <TableCell>{claim.claimType ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{claim.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {claim.claimedAmount ?? "—"}{" "}
                    {claim.claimedAmount ? "VND" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
    </div>
  );
}
