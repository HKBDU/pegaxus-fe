import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { HandoverAudience } from "../constants"

interface Props {
  audience: HandoverAudience
  title: string
  /** Sub pages go back to the list; the list itself is the landing page of the tab and has no back link. */
  backHref?: string
  backLabel?: string
  action?: ReactNode
  children: ReactNode
}

/**
 * Content frame of a Handovers tab page. The page shell (header, tab bar, layout) belongs to the transport shell, so this only
 * draws the section title, the optional back link and the page action. The crew gets room below for the fixed action bar.
 */
export function PageFrame({ audience, title, backHref, backLabel = "Back", action, children }: Props) {
  return (
    <section aria-label={title} className={cn("space-y-4", audience === "crew" && "pb-28")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <Link
              to={backHref}
              aria-label={backLabel}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40 sm:size-9"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
          ) : null}
          <h2 className="my-0! min-w-0 truncate font-heading text-base! leading-6! font-bold tracking-[0.06em]! text-gray-900! uppercase">{title}</h2>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}
