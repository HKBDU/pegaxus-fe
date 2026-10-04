import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { EntityId } from "@/shared/types"

export type DossierTab = "overview" | "requirements" | "documents" | "audit"

const TABS: { id: DossierTab; label: string; path?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements", path: "requirements" },
  { id: "documents", label: "Documents" },
  { id: "audit", label: "Audit History", path: "audit-history" },
]

/** The tab strip of the dossier detail page. Tabs that belong to other screens (no path yet) are shown but disabled. */
export function DossierTabs({ dossierId, active }: { dossierId: EntityId; active: DossierTab }) {
  return (
    <nav aria-label="Dossier sections" className="flex gap-6 border-b border-slate-200">
      {TABS.map((tab) =>
        tab.path ? (
          <NavLink
            key={tab.id}
            to={`/compliance-dossiers/${dossierId}/${tab.path}`}
            aria-current={tab.id === active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-0.5 py-2.5 text-sm transition-colors",
              tab.id === active ? "border-[#ef8f00] font-semibold text-[#ef8f00]" : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {tab.label}
          </NavLink>
        ) : (
          <span key={tab.id} aria-disabled="true" className="-mb-px cursor-not-allowed border-b-2 border-transparent px-0.5 py-2.5 text-sm text-slate-300">
            {tab.label}
          </span>
        ),
      )}
    </nav>
  )
}
