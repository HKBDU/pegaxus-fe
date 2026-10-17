import { NavLink, useLocation } from "react-router-dom";
import type { TransportAudience } from "../types";
import { transportOverviewPath, transportSegmentsPath } from "../navigation";

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
          className={({ isActive }) =>
            `inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary ${isActive ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-primary"}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          end
          to={transportSegmentsPath(transportId, audience, bookingId)}
          state={location.state}
          className={({ isActive }) =>
            `inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary ${isActive ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-primary"}`
          }
        >
          Route Tracking
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
