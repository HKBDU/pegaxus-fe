import { useEffect, useId, useRef } from "react"
import { fancyText, formatPageTitle } from "@/lib/fancy-text"
import { setFaviconBadge } from "@/lib/favicon"

interface TitleEntry {
  id: string
  title: string
  count: number
}

const DEFAULT_TITLE = fancyText("PEGAXUS")
const titleStack: TitleEntry[] = []

function syncActiveTitle(): void {
  if (typeof document === "undefined") return

  if (titleStack.length === 0) {
    document.title = DEFAULT_TITLE
    setFaviconBadge(false)
    return
  }

  const active = titleStack[titleStack.length - 1]
  document.title = active.title
  setFaviconBadge(active.count > 0)
}

/**
 * Hook to manage stylized per-page browser tab branding, attention counts, and favicon badges.
 *
 * @param page Short English page title, e.g. "Create Booking".
 *             When omitted or empty, defaults to fancy brand "{fancy(PEGAXUS)}".
 * @param count Attention count for unread/pending items. Prefix "(N) " when > 0, capped at "(9+) ".
 */
export function usePageTitle(page?: string, count = 0): void {
  const instanceId = useId()
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    const title = formatPageTitle(page, count)

    const existingIndex = titleStack.findIndex((entry) => entry.id === instanceId)
    if (existingIndex >= 0) {
      titleStack[existingIndex] = { id: instanceId, title, count }
    } else {
      titleStack.push({ id: instanceId, title, count })
    }

    syncActiveTitle()

    return () => {
      isMountedRef.current = false
      const index = titleStack.findIndex((entry) => entry.id === instanceId)
      if (index >= 0) {
        titleStack.splice(index, 1)
      }
      syncActiveTitle()
    }
  }, [instanceId, page, count])
}

