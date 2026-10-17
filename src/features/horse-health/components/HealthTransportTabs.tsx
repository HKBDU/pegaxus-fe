import { Link } from "react-router-dom"

import { HORSE_HEALTH_ROUTES } from "../constants"

export function HealthTransportTabs({ transportId, active = "health", healthHref }: { transportId: string; active?: "health" | "history"; healthHref?: string }) {
  return <nav className="flex gap-1 border-b border-slate-200" aria-label="Transport health navigation"><Link to={healthHref ?? HORSE_HEALTH_ROUTES.health(transportId)} className={`min-h-12 border-b-2 px-3 py-3 text-sm font-semibold ${active === "health" ? "border-orange-600 text-orange-700" : "border-transparent text-slate-500"}`}>Health overview</Link><span className="min-h-12 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-400">GPS unavailable</span></nav>
}
