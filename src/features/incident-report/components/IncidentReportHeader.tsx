import { MapPin } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";

export interface IncidentReportHeaderProps {
  transportId: string;
  longitude: number | string;
  latitude: number | string;
  locationDescription: string;
  backHref?: string;
}

/** Compact, mobile-first context block shown at the top of an incident form. */
export function IncidentReportHeader({
  transportId,
  longitude,
  latitude,
  locationDescription,
  backHref = "/crew",
}: IncidentReportHeaderProps) {
  return (
    <header className="space-y-4">
      <PageHeader
        title="Incident Report"
        backHref={backHref}
        className="gap-0 [&_h1]:!my-0 [&_h1]:text-[32px] [&_h1]:leading-9 [&_h1]:tracking-[-0.8px]"
      />

      <div className="min-w-0 space-y-3 border-y border-slate-200 py-3 text-sm text-slate-800">
        <p className="break-words font-semibold uppercase tracking-[0.04em]">
          {transportId}
        </p>

        <div className="flex items-start gap-2 leading-5">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-[#f39200]"
            aria-hidden="true"
          />
          <p className="min-w-0 break-words">
            {longitude}, {latitude} - {locationDescription}
          </p>
        </div>
      </div>
    </header>
  );
}
