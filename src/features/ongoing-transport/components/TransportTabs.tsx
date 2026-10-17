import { NavLink, useLocation } from "react-router-dom";
import type { TransportAudience } from "../types";
import { transportOverviewPath } from "../navigation";

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
  const futureTabs = [
    "Route Tracking",
    "Horse Health",
    ...(canViewGpsTab && audience !== "crew" ? ["GPS Map"] : []),
  ];
  return (
    <nav
      aria-label="Transport views"
      className="overflow-x-auto border-b border-slate-200 px-1"
    >
      <div className="flex w-max min-w-full items-stretch gap-5">
        <NavLink
          end
          to={transportOverviewPath(transportId, audience, bookingId)}
          state={location.state}
          aria-current="page"
          className="inline-flex min-h-11 items-center border-b-2 border-primary px-0.5 text-sm font-semibold whitespace-nowrap text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          Overview
        </NavLink>
        {futureTabs.map((label) => (
          <span
            key={label}
            title={`${label} is not available yet`}
            className="inline-flex"
          >
            <button
              type="button"
              disabled
              className="min-h-11 cursor-not-allowed border-b-2 border-transparent px-0.5 text-sm whitespace-nowrap text-slate-400"
            >
              {label}
              <span className="sr-only"> — Coming soon</span>
            </button>
          </span>
        ))}
      </div>
    </nav>
  );
}
