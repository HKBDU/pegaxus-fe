import { AlertTriangle, CircleDot, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorState, LoadingState } from "@/shared/components/common";
import { useIsDesktop } from "@/shared/hooks";
import { PageHeader } from "@/shared/components/PageHeader";
import { formatUtcDateTime } from "@/shared/utils/datetime";

import { CrewHomeActions } from "../components/CrewHomeActions";
import { CrewShell } from "../components/CrewShell";
import { useAssignedTransports } from "../hooks/useAssignedTransports";
import type { AssignedTransport } from "../types";

function formatDate(value: string | null) {
  return formatUtcDateTime(value);
}

function TransportCard({ transport }: { transport: AssignedTransport }) {
  return (
    <article className="overflow-hidden rounded-[2px] border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {transport.transportCode}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Booking code: {transport.bookingCode}
            </p>
          </div>
          <span className="rounded-[2px] bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            {transport.status.replace("_", " ")}
          </span>
        </div>
        <div className="grid gap-y-2 pt-0 text-xs text-slate-500">
          <span className="col-span-2 font-semibold text-slate-800">
            Horse: {transport.horseCount}
          </span>
          <span className="col-span-2 truncate font-semibold text-slate-800">
            {transport.currentSegment
              ? `${transport.currentSegment.fromLocationName} → ${transport.currentSegment.toLocationName}`
              : "Not started"}
          </span>
          <span>Departure: {formatDate(transport.departureAt)}</span>
          <span>ETA: {formatDate(transport.etaAt)}</span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <CrewHomeActions transport={transport} />
      </div>
    </article>
  );
}

function DesktopFrame({ children }: { children: ReactNode }) {
  return <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">{children}</div>;
}

export default function CrewHomePage() {
  const query = useAssignedTransports();
  const isDesktop = useIsDesktop();
  const currentTransport =
    query.data?.items.find((transport) => transport.status === "IN_TRANSIT") ??
    query.data?.items.find((transport) => transport.status === "READY");

  // Desktop: the same page frame as the booking list (inside the employee shell). Phones keep the compact crew frame.
  const Frame = isDesktop ? DesktopFrame : CrewShell;

  return (
    <Frame>
      <div className={isDesktop ? "booking-page-enter mx-auto w-full max-w-[1152px] space-y-4" : "mx-auto max-w-3xl space-y-4"}>
        <PageHeader
          title="ONGOING TRANSPORT"
          backHref="/crew/transports"
          showBack={false}
        />
        {query.isPending ? (
          <LoadingState />
        ) : query.error && !query.data ? (
          <ErrorState
            message={
              query.error instanceof Error
                ? query.error.message
                : "Unable to load assigned transports."
            }
            onRetry={() => void query.refetch()}
          />
        ) : !currentTransport ? (
          <div className="rounded-[2px] border border-dashed border-slate-300 bg-white p-8 text-center">
            <CircleDot className="mx-auto size-8 text-slate-300" />
            <h2 className="mt-3 font-semibold text-slate-800">
              No assigned transport
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              No ready or in-transit transport is assigned to you.
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-[2px] bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              <RefreshCw className="size-4" />
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {query.error && (
              <div className="flex items-start gap-2 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Live refresh failed. Showing last known transport
                {query.data?.serverTime
                  ? ` from ${formatDate(query.data.serverTime)}`
                  : ""}
                .
              </div>
            )}
            <TransportCard transport={currentTransport} />
          </div>
        )}
      </div>
    </Frame>
  );
}
