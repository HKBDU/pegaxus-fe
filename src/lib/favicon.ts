/**
 * Favicon badge management utility.
 * Renders an attention dot in Pegaxus orange (#f39200) onto the favicon canvas.
 * Supports background tab pulsing when reduced motion is not preferred.
 */

const PEGAXUS_ORANGE = "#f39200"

const originalHrefs = new Map<HTMLLinkElement, string>()
let cachedBadgeUrl: string | null = null
let currentTheme: "light" | "dark" | null = null
let isBadgeActive = false
let isPulseShowingBadge = false
let pulseTimerId: number | null = null
let visibilityListenerRegistered = false

function getIconLinks(): HTMLLinkElement[] {
  if (typeof document === "undefined") return []
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]'))
}

function ensureOriginalHrefs(): void {
  const links = getIconLinks()
  links.forEach((link) => {
    if (!originalHrefs.has(link)) {
      const href = link.getAttribute("href") || link.href
      if (href) originalHrefs.set(link, href)
    }
  })
}

function getActiveFaviconUrl(): string {
  if (typeof window === "undefined") return "/favicon.png"
  const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
  const links = getIconLinks()

  for (const link of links) {
    const orig = originalHrefs.get(link) ?? link.getAttribute("href") ?? link.href
    const media = link.getAttribute("media")
    if (media) {
      if (isDark && media.includes("dark")) return orig
      if (!isDark && media.includes("light")) return orig
    }
  }

  const first = links[0]
  if (first) {
    return originalHrefs.get(first) ?? first.getAttribute("href") ?? first.href
  }

  return isDark ? "/favicon-dark.png" : "/favicon-light.png"
}

function applyFaviconHref(href: string): void {
  if (typeof document === "undefined") return
  let links = getIconLinks()
  if (links.length === 0) {
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/png"
    document.head.appendChild(link)
    originalHrefs.set(link, href)
    links = [link]
  }

  links.forEach((link) => {
    link.href = href
  })
}

function restoreOriginalFavicon(): void {
  if (typeof document === "undefined") return
  const links = getIconLinks()
  links.forEach((link) => {
    const orig = originalHrefs.get(link)
    if (orig && link.getAttribute("href") !== orig) {
      link.href = orig
    }
  })
}

function generateBadgeDataUrl(callback: (url: string | null) => void): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    callback(null)
    return
  }

  const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  if (cachedBadgeUrl && currentTheme === isDark) {
    callback(cachedBadgeUrl)
    return
  }

  currentTheme = isDark
  const sourceUrl = getActiveFaviconUrl()

  const img = new Image()
  img.crossOrigin = "anonymous"
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        callback(null)
        return
      }

      ctx.clearRect(0, 0, 64, 64)
      ctx.drawImage(img, 0, 0, 64, 64)

      // Top-right notification dot in Pegaxus orange (#f39200)
      ctx.fillStyle = PEGAXUS_ORANGE
      ctx.beginPath()
      ctx.arc(52, 12, 9, 0, Math.PI * 2)
      ctx.fill()

      cachedBadgeUrl = canvas.toDataURL("image/png")
      callback(cachedBadgeUrl)
    } catch {
      callback(null)
    }
  }

  img.onerror = () => {
    // Graceful fallback: do nothing, don't crash, no console error
    callback(null)
  }

  img.src = sourceUrl
}

function stopPulse(): void {
  if (pulseTimerId !== null) {
    clearInterval(pulseTimerId)
    pulseTimerId = null
  }
}

function syncPulseState(): void {
  stopPulse()
  if (!isBadgeActive || typeof window === "undefined" || typeof document === "undefined") return

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  if (document.hidden && !prefersReducedMotion) {
    isPulseShowingBadge = true
    if (cachedBadgeUrl) applyFaviconHref(cachedBadgeUrl)

    pulseTimerId = window.setInterval(() => {
      isPulseShowingBadge = !isPulseShowingBadge
      if (isPulseShowingBadge && cachedBadgeUrl) {
        applyFaviconHref(cachedBadgeUrl)
      } else {
        restoreOriginalFavicon()
      }
    }, 800)
  } else {
    // Tab is visible or reduced motion: solid badge
    if (cachedBadgeUrl) {
      applyFaviconHref(cachedBadgeUrl)
    }
  }
}

export function setFaviconBadge(show: boolean): void {
  if (typeof document === "undefined") return

  ensureOriginalHrefs()

  if (!visibilityListenerRegistered && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (isBadgeActive) {
        syncPulseState()
      }
    })
    visibilityListenerRegistered = true
  }

  if (!show) {
    isBadgeActive = false
    stopPulse()
    restoreOriginalFavicon()
    return
  }

  isBadgeActive = true
  generateBadgeDataUrl((url) => {
    if (!isBadgeActive) return
    if (url) {
      applyFaviconHref(url)
      syncPulseState()
    }
  })
}

