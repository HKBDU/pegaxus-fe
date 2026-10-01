import { useCallback, useEffect, useRef, useState } from "react"

const RETRY_COOLDOWN_MS = 3000

type GuardResult<T> =
  | { started: false }
  | { started: true; value: T }

/**
 * Prevents duplicate booking requests before React has time to render a pending state.
 * A failed request stays blocked for a short cooldown (or until the caller resets the guard).
 */
export function useBookingRequestGuard() {
  const runningRef = useRef(false)
  const blockedRef = useRef(false)
  const resetAfterRunRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const run = useCallback(async <T,>(request: () => Promise<T>): Promise<GuardResult<T>> => {
    if (runningRef.current || blockedRef.current) return { started: false }

    runningRef.current = true
    try {
      return { started: true, value: await request() }
    } catch (error) {
      blockedRef.current = true
      setIsBlocked(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        blockedRef.current = false
        setIsBlocked(false)
      }, RETRY_COOLDOWN_MS)
      throw error
    } finally {
      runningRef.current = false
      if (resetAfterRunRef.current) {
        resetAfterRunRef.current = false
        blockedRef.current = false
        setIsBlocked(false)
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (runningRef.current) {
      resetAfterRunRef.current = true
      return
    }
    clearTimeout(timerRef.current)
    blockedRef.current = false
    setIsBlocked(false)
  }, [])

  return { isBlocked, reset, run }
}
