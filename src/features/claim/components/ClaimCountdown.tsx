import { Timer } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Seconds left now: the BE's `remainingSeconds` minus the time since that answer arrived (the machine clock is never trusted for the deadline). */
export function useRemainingSeconds(remainingSeconds: number | null | undefined, receivedAt: number) {
  const [now, setNow] = useState(() => receivedAt)
  const active = typeof remainingSeconds === "number" && remainingSeconds > 0
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active, receivedAt])
  if (typeof remainingSeconds !== "number") return null
  return Math.max(0, remainingSeconds - Math.max(0, Math.floor((now - receivedAt) / 1000)))
}

export function formatRemaining(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours > 0 ? `${hours}H ${String(minutes).padStart(2, "0")}M` : `${String(minutes).padStart(2, "0")}M ${String(rest).padStart(2, "0")}S`
}

export function ClaimCountdown({ seconds, className }: { seconds: number | null; className?: string }) {
  if (seconds === null) return null
  const expired = seconds <= 0
  return (
    <span
      role="timer"
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-1 font-heading text-[11px] font-bold uppercase tracking-[0.04em]",
        expired ? "text-red-700" : seconds < 3600 ? "text-red-600" : "text-[#a85f00]",
        className,
      )}
    >
      <Timer aria-hidden="true" className="size-3" />
      {expired ? "Claim window closed" : `${formatRemaining(seconds)} remaining`}
    </span>
  )
}
