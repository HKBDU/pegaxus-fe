import { ArrowRight, House, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="relative flex h-[100svh] max-h-[100svh] min-h-0 w-full flex-col overflow-hidden bg-[#17191c] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-[#f39200]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-56 -right-40 size-[38rem] rounded-full bg-[#f39200]/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 right-0 top-[38%] border-t border-dashed border-[#f39200]/25" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] !text-[#f39200]">
          <span className="h-px w-12 bg-[#f39200]" />
          Pegaxus / Route control
          <span className="h-px w-12 bg-[#f39200]" />
        </div>

        <div className="relative flex flex-col items-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-[#f39200]/35 bg-[#f39200]/10 font-serif text-3xl !text-[#f6a62d]" aria-hidden="true">
            &#9822;
          </div>
          <div
            className="select-none font-heading font-semibold leading-[0.8] tracking-[-0.04em] !text-[#f39200]"
            style={{ fontSize: 'clamp(8rem, 22vw, 19rem)' }}
            aria-label="404"
          >
            404
          </div>
        </div>

        <div className="mt-8 max-w-xl">
          <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] !text-[#f6a62d]">
            <MapPin className="size-3.5" />
            Destination unavailable
          </div>
          <h1 className="font-heading text-3xl font-semibold uppercase tracking-[0.12em] !text-white sm:text-5xl">Page not found</h1>
          <p className="mt-4 text-sm leading-6 !text-white/65 sm:text-base">This route has wandered off the map. Return to the Pegaxus stable and continue your journey.</p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-none bg-[#f39200] px-5 py-3 text-sm font-bold !text-[#171717] shadow-[0_10px_30px_rgba(243,146,0,0.25)] transition hover:bg-[#ffad32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200]"
          >
            <House className="size-4" />
            Return Home
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex justify-center px-6 pb-7 text-[10px] font-semibold uppercase tracking-[0.24em] !text-white/30">
        <span className="mr-2 mt-1 size-1.5 shrink-0 rounded-full bg-[#f39200]" />
        Cross-border horse transport, kept on course
      </div>
    </main>
  )
}
