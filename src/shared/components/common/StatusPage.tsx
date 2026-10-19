import { ArrowRight, House, LogIn, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

type StatusPageProps = {
  image: string
  imageAlt: string
  eyebrow: string
  title: string
  description: string
  primaryLabel?: string
  primaryTo?: string
  primaryAction?: 'home' | 'login' | 'retry'
  onRetry?: () => void
}

export function StatusPage({
  image,
  imageAlt,
  eyebrow,
  title,
  description,
  primaryLabel = 'Return Home',
  primaryTo = '/',
  primaryAction = 'home',
  onRetry,
}: StatusPageProps) {
  const primaryContent = (
    <>
      {primaryAction === 'retry' ? <RefreshCw className="size-4" /> : primaryAction === 'login' ? <LogIn className="size-4" /> : <House className="size-4" />}
      {primaryLabel}
      {primaryAction === 'home' ? <ArrowRight className="size-4" /> : null}
    </>
  )

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#f5eee3] text-[#3d2a1d]">
      <img src={image} alt={imageAlt} className="absolute inset-0 size-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#fffaf2]/55" />
      <div className="absolute inset-y-0 right-0 flex w-full items-center justify-center px-6 py-12 sm:w-[48%] sm:justify-start sm:px-10 lg:w-[44%] lg:px-14">
        <section className="w-full max-w-md rounded-[2px] border border-[#d8b77e]/55 bg-[#fffaf2]/88 p-6 shadow-[0_18px_60px_rgba(77,45,20,0.14)] backdrop-blur-[2px] sm:p-8 lg:p-10">
          <div className="mb-6 flex items-center gap-3 font-heading text-[10px] font-bold uppercase tracking-[0.24em] text-[#b86512]">
            <span className="h-0.5 w-8 bg-[#f39200]" />
            Pegaxus / Route control
          </div>
          <p className="font-heading text-xs font-bold uppercase tracking-[0.18em] text-[#b86512]">{eyebrow}</p>
          <h1 className="mt-3 font-heading text-3xl font-bold uppercase leading-tight tracking-[0.06em] text-[#3d2a1d] sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#765f48] sm:text-base">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {primaryAction === 'retry' ? (
              <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="inline-flex items-center gap-2 rounded-none bg-[#f39200] px-5 py-3 text-sm font-bold text-[#171717] shadow-[0_10px_30px_rgba(243,146,0,0.25)] transition hover:bg-[#ffad32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200]">
                {primaryContent}
              </button>
            ) : (
              <Link to={primaryTo} className="inline-flex items-center gap-2 rounded-none bg-[#f39200] px-5 py-3 text-sm font-bold text-[#171717] shadow-[0_10px_30px_rgba(243,146,0,0.25)] transition hover:bg-[#ffad32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200]">
                {primaryContent}
              </Link>
            )}
          </div>
          <div className="mt-8 border-t border-[#d8b77e]/45 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b8066]">
            Cross-border horse transport, kept on course
          </div>
        </section>
      </div>
    </main>
  )
}

export function ForbiddenPage() {
  return <StatusPage image="/Forbidden.png" imageAlt="Horse transport at a restricted checkpoint" eyebrow="403 / Access restricted" title="Access denied" description="Your current role does not have permission to enter this route-control area." />
}

export function ServerErrorPage() {
  return <StatusPage image="/ServerError.png" imageAlt="Horse transport operation during a temporary system interruption" eyebrow="500 / System interruption" title="Something went wrong" description="Pegaxus could not complete this operation. Please try again in a moment." primaryLabel="Try again" primaryAction="retry" />
}

export function NetworkErrorPage() {
  return <StatusPage image="/NetworkError.png" imageAlt="Horse transport route waiting for a network connection" eyebrow="Connection interrupted" title="Route connection lost" description="We could not reach the Pegaxus service. Check your connection and try again." primaryLabel="Try again" primaryAction="retry" />
}
