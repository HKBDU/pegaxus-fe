import type { ReactNode } from "react"
import { PageHeader } from "@/shared/components/PageHeader"
import type { HandoverAudience } from "../constants"
import { CrewShell } from "./CrewShell"

interface Props {
  audience: HandoverAudience
  title: string
  backHref: string
  backLabel: string
  action?: ReactNode
  children: ReactNode
}

/** Admin and customer pages use the system page layout (same width and spacing as Transport Request); the crew gets the phone shell. */
export function PageFrame({ audience, title, backHref, backLabel, action, children }: Props) {
  if (audience === "crew") {
    return (
      <CrewShell title={title} backHref={backHref} backLabel={backLabel}>
        <div className="space-y-4">
          {action ? <div className="flex justify-end">{action}</div> : null}
          {children}
        </div>
      </CrewShell>
    )
  }
  return (
    <div className="min-h-[calc(100svh-5rem)] px-4 py-4 sm:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-[1152px] space-y-4">
        <PageHeader title={title} backHref={backHref} backLabel={backLabel} action={action} />
        {children}
      </div>
    </div>
  )
}
