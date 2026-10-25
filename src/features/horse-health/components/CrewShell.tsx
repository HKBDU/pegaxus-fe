import type { ReactNode } from "react"

export function CrewShell({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100svh-3rem)] bg-slate-50 px-3 py-5 sm:px-6 lg:px-10">{children}</div>
}
