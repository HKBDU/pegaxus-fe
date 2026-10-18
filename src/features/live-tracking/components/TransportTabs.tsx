import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { trackingPaths, type TrackingAudience } from "../constants"

interface TransportTabsProps {
  audience: TrackingAudience
  transportId: string
  bookingId?: string
}

/** The tab bar of a transport (this feature keeps its own copy; the other tabs belong to other features). */
export function TransportTabs({ audience, transportId, bookingId }: TransportTabsProps) {
  const paths = trackingPaths.tabs(audience, transportId, bookingId)
  const tabs = [
    { label: "Overview", to: paths.overview },
    { label: "Route", to: paths.route },
    { label: "Health", to: paths.health },
    { label: "GPS", to: paths.gps },
  ]
  return (
    <nav aria-label="Transport tabs" className="flex gap-1 overflow-x-auto border-b border-[#e5e2d9]">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              "-mb-px border-b-2 px-4 py-2 font-heading text-xs font-medium uppercase tracking-[0.1em] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
