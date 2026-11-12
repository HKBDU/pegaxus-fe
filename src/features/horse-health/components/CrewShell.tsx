import type { ReactNode } from "react"

// The web's warm page background (#f4f2ed): the old slate-50 made crew pages look like a different product.
export function CrewShell({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100svh-3rem)] bg-[#f4f2ed] px-3 py-5 sm:px-6 lg:px-10">{children}</div>
}
