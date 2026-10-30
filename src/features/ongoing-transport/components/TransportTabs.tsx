import { NavLink, useLocation } from "react-router-dom";
import type { TransportAudience } from "../types";
import {
  transportGpsPath,
  transportHandoversPath,
  transportHealthPath,
  transportOverviewPath,
  transportSegmentsPath,
} from "../navigation";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary ${isActive ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-primary"}`;

/**
 * The tab bar of a transport: Overview, Route Tracking, Horse Health, GPS Map (crew always, staff and Customer when the BE
 * allows it) and Handovers. The sub pages of a tab (a horse's history, a handover record) keep their tab highlighted.
 */
export function TransportTabs({
  transportId,
  bookingId,
  audience,
  canViewGpsTab,
}: {
  transportId: string;
  bookingId?: string;
  audience: TransportAudience;
  canViewGpsTab: boolean;
}) {
  const location = useLocation();
  const tabs = [
    {
      label: "Overview",
      to: transportOverviewPath(transportId, audience, bookingId),
      end: true,
    },
    {
      label: "Route Tracking",
      to: transportSegmentsPath(transportId, audience, bookingId),
      end: true,
    },
    {
      label: "Horse Health",
      to: transportHealthPath(transportId, audience, bookingId),
      end: false,
    },
    ...(canViewGpsTab || audience === "crew"
      ? [
          {
            label: "GPS Map",
            to: transportGpsPath(transportId, audience, bookingId),
            end: true,
          },
        ]
      : []),
    {
      label: "Handovers",
      to: transportHandoversPath(transportId, audience, bookingId),
      end: false,
    },
  ];
  return (
    <nav
      aria-label="Transport views"
      className="overflow-x-auto border-b border-slate-200 px-1"
    >
      <div className="flex w-max min-w-full items-stretch gap-5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            end={tab.end}
            to={tab.to}
            state={location.state}
            preventScrollReset={audience === "crew"}
            className={tabClass}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
