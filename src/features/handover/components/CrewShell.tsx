import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

interface Props {
  title: string
  backHref: string
  backLabel?: string
  children: ReactNode
}

/**
 * Mobile shell for the crew (Driver, Escort): a bar with a large back button and no sidebar, no animation (crew rule).
 * Own copy for this feature on purpose: features never share layouts.
 */
export function CrewShell({ title, backHref, backLabel = "Back", children }: Props) {
  return (
    <div className="min-h-svh bg-[#f3f1ec] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-2">
          <Link
            to={backHref}
            aria-label={backLabel}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
          </Link>
          <h1 className="my-0! min-w-0 truncate font-heading text-base! leading-6! font-bold tracking-wide! text-gray-900! uppercase">{title}</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 pt-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:px-4">{children}</main>
    </div>
  )
}
