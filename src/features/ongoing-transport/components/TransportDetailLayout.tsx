import { Outlet, useLocation, useParams } from "react-router-dom";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTransportOverview } from "../hooks/useTransportOverview";
import { transportViewFromPath } from "../navigation";
import type { TransportAudience } from "../types";
import { TransportPageHeader } from "./TransportPageHeader";
import { TransportTabs } from "./TransportTabs";
import "../ui.css";

/**
 * The one shell of a transport for every audience: breadcrumb, header, tab bar and the page of the open tab. The tab pages
 * (Overview, Route Tracking, Horse Health, GPS Map, Handovers) render inside its <Outlet /> and draw no shell of their own.
 * The header data comes from OT3, which the Overview tab shares through the query cache.
 */
export function TransportDetailLayout({
  audience,
}: {
  audience: TransportAudience;
}) {
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const { pathname } = useLocation();
  const view = transportViewFromPath(pathname);
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  const metadata = useTransportOverview(
    transportId,
    bookingId,
    audience,
    "data",
    false,
  );
  const overview = metadata.isError ? undefined : metadata.data;
  const missingContext =
    transportId === undefined ||
    (audience === "customer" && bookingId === undefined);

  return (
    <div
      className={`ongoing-transport-ui transport-overview ${view === "segments" ? "route-tracking " : ""}booking-page-shell min-h-[calc(100svh-5rem)] min-w-0 px-4 py-4 font-sans sm:px-6`}
      data-audience={audience}
    >
      <div
        className={`mx-auto w-full min-w-0 ${view === "segments" ? "space-y-4" : "space-y-3"} ${audience === "crew" ? "max-w-4xl" : "booking-page-enter max-w-[1440px]"}`}
      >
        <TransportPageHeader
          audience={audience}
          bookingId={bookingId}
          transportId={transportId}
          transportCode={overview?.transport.transportCode}
          bookingCode={overview?.booking.bookingCode}
          status={overview?.transport.status}
          view={view}
          busy={fetching}
          online={metadata.online}
          onRefresh={() => void queryClient.refetchQueries({ type: "active" })}
        />
        {!missingContext ? (
          <TransportTabs
            transportId={transportId!}
            bookingId={bookingId}
            audience={audience}
            canViewGpsTab={overview?.canViewGpsTab ?? false}
          />
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
