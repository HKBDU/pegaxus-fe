import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HorseLoader } from './HorseLoader'

export function LoadingState() {
  return (
    <div className="flex min-h-40 items-center justify-center p-6"><HorseLoader size="page" /></div>
  )
}

export function ErrorState({
  message = 'An error occurred',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#f1d3a2] bg-[#fffaf2] p-6 text-[#4b3520] shadow-[0_12px_30px_rgba(23,25,28,0.06)] sm:p-8" role="alert">
      <div className="absolute -right-10 -top-12 size-32 rounded-full bg-[#f39200]/10" />
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#17191c] text-[#f39200] shadow-sm">
          <AlertTriangle className="size-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-xl font-semibold uppercase tracking-wide text-[#17191c]">Oops!</p>
          <p className="mt-1 text-sm leading-6 text-[#765f48]">{message}</p>
          {onRetry ? (
            <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#f39200] px-4 py-2 text-sm font-bold text-[#171717] transition hover:bg-[#d97d00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200]" onClick={onRetry}>
              <RefreshCw className="size-4" />
              Try again
            </button>
          ) : null}
          <Link
            to="/"
            className="mt-5 inline-flex items-center rounded-md border border-[#d8b77e] bg-white px-4 py-2 text-sm font-bold text-[#76511e] transition hover:border-[#f39200] hover:bg-[#fff3df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f39200] sm:ml-2"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
      <p>{message}</p>
    </div>
  )
}
