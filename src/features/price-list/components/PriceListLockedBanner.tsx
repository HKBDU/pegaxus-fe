import { Lock } from "lucide-react"
import type { ReactNode } from "react"

interface PriceListLockedBannerProps {
  /** The Clone button, the only way forward from a locked list. */
  action?: ReactNode
}

/** Shown on the active list, which the BE keeps locked. */
export function PriceListLockedBanner({ action }: PriceListLockedBannerProps) {
  return (
    <div role="status" className="flex flex-col gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 flex items-start gap-2 leading-5">
        <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          This price list is active and completely locked. To modify rates, prices or line items, clone it, edit the copy, then activate it.
        </span>
      </p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
