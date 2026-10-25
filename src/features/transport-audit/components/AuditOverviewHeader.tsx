import { FileArchive, FileText, ArrowRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { TransportAuditFull } from "../types";

export function AuditOverviewHeader({
  audit,
  onExport,
  onPreviewEpod,
}: {
  audit: TransportAuditFull;
  onExport: () => void;
  onPreviewEpod?: () => void;
}) {
  const canExport = audit.status === "COMPLETED";
  const completedDate = audit.completedAt
    ? new Date(audit.completedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : undefined;

  const origin = audit.booking?.originCountry || audit.originCountry;
  const destination =
    audit.booking?.destinationCountry || audit.destinationCountry;

  return (
    <section className="rounded-[2px] border border-[#2e517d] bg-gradient-to-r from-[#183457] via-[#1e3d64] to-[#1b365a] p-5 text-white shadow-md">
      {/* Top row: Transport Code & Status on Left, Route & Actions on Right (balanced top-right) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[#93c5fd]">
            Transport audit dossier
          </p>
          <h1
            className="mt-1 text-2xl font-bold !text-white sm:text-3xl"
            style={{ color: "#ffffff" }}
          >
            {audit.transportCode}
          </h1>
          <Badge className="mt-2 bg-[#f39200] text-black font-semibold">
            {audit.status}
          </Badge>
        </div>

        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          {origin && destination ? (
            <div className="inline-flex items-center gap-2 rounded-[2px] border border-[#355d8a] bg-[#142b47]/80 px-3 py-1 text-xs text-[#bfdbfe]">
              <span className="font-semibold text-white">{origin}</span>
              <ArrowRight className="size-3 text-[#f39200]" />
              <span className="font-semibold text-white">{destination}</span>
              {completedDate ? (
                <>
                  <span className="text-white/20">|</span>
                  <span className="text-[#93c5fd]">{completedDate}</span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {onPreviewEpod || audit.epod?.downloadUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreviewEpod}
                className="h-10 rounded-[2px] border-[#355d8a] bg-[#173254] px-4 text-xs font-medium text-[#bfdbfe] hover:bg-[#204470] hover:text-white"
              >
                <FileText className="size-4 mr-1.5 text-[#93c5fd]" />
                View e-POD
              </Button>
            ) : null}

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
              <FileArchive className="size-4 mr-1.5" /> Export package
            </Button>
          </div>
        </div>
      </div>

      {/* 5-Column Metrics: Norwegian blue tone with ice-blue labels text-[#93c5fd] */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#2e517d]/70 pt-4 sm:grid-cols-5">
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#93c5fd]">Timeline</p>
          <p className="text-lg font-bold !text-white" style={{ color: "#ffffff" }}>
            {audit.timeline.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#93c5fd]">Horses</p>
          <p className="text-lg font-bold !text-white" style={{ color: "#ffffff" }}>
            {Array.isArray(audit.horses?.horses)
              ? audit.horses.horses.length
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#93c5fd]">Booking</p>
          <p className="text-lg font-bold !text-white" style={{ color: "#ffffff" }}>
            {audit.booking ? "Ready" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#93c5fd]">Compliance</p>
          <p className="text-lg font-bold !text-white" style={{ color: "#ffffff" }}>
            {audit.compliance ? "Ready" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#93c5fd]">Financial</p>
          <p className="text-lg font-bold !text-white" style={{ color: "#ffffff" }}>
            {audit.finance ? "Ready" : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
