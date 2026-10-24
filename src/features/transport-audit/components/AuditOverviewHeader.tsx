import { FileArchive } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { TransportAuditFull } from "../types";
export function AuditOverviewHeader({
  audit,
  onExport,
}: {
  audit: TransportAuditFull;
  onExport: () => void;
}) {
  const canExport = audit.status === "COMPLETED";
  return (
    <section className="rounded-[2px] border border-[#d9d3c7] bg-white p-5 text-[#17191c] shadow-[0_4px_14px_rgba(23,25,28,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Transport audit dossier
          </p>
          <h1 className="mt-1 text-2xl font-bold">{audit.transportCode}</h1>
          <Badge className="mt-2 bg-[#f39200] text-black">{audit.status}</Badge>
        </div>
        <Button
          disabled={!canExport}
          title={
            canExport
              ? "Export audit package"
              : "Export is available after transport completion"
          }
          onClick={onExport}
          className="h-10 rounded-[2px] bg-[#f39200] px-5 font-semibold text-black shadow-[0_4px_12px_rgba(243,146,0,0.28)] hover:bg-[#ffad2f] hover:shadow-[0_5px_16px_rgba(243,146,0,0.38)]"
        >
          <FileArchive className="size-4" /> Export package
        </Button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#ece7dd] pt-4 sm:grid-cols-5">
        <div>
          <p className="text-[10px] uppercase text-slate-500">Timeline</p>
          <p className="text-lg font-semibold">{audit.timeline.length}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Horses</p>
          <p className="text-lg font-semibold">
            {Array.isArray(audit.horses?.horses)
              ? audit.horses.horses.length
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Booking</p>
          <p className="text-lg font-semibold">
            {audit.booking ? "Ready" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Compliance</p>
          <p className="text-lg font-semibold">
            {audit.compliance ? "Ready" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Financial</p>
          <p className="text-lg font-semibold">
            {audit.finance ? "Ready" : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
