import { useCallback, useRef, useState } from "react"

type GuardResult<T> =
  | { started: false }
  | { started: true; value: T }

/**
 * Prevents duplicate booking requests before React has time to render a pending state.
 * A failed request stays blocked until the caller explicitly resets the guard.
 */
export function useBookingRequestGuard() {
  const runningRef = useRef(false)
  const blockedRef = useRef(false)
  const resetAfterRunRef = useRef(false)
  const [isBlocked, setIsBlocked] = useState(false)

  const run = useCallback(async <T,>(request: () => Promise<T>): Promise<GuardResult<T>> => {
    if (runningRef.current || blockedRef.current) return { started: false }

    runningRef.current = true
    try {
      return { started: true, value: await request() }
    } catch (error) {
      blockedRef.current = true
      setIsBlocked(true)
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
    blockedRef.current = false
    setIsBlocked(false)
  }, [])

  return { isBlocked, reset, run }
}
