import { useEffect, useState } from "react"

/** The current time, refreshed every `intervalMs`: lets a component re-evaluate "how old is this sample" while idle. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
