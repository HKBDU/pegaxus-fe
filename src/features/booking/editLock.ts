import { useAuthStore } from "@/features/auth/store"
import { bookingService } from "@/features/booking/services"
import type { Booking } from "@/features/booking/types"
import { queryClient } from "@/lib/queryClient"
import type { EntityId } from "@/shared/types"

export interface BookingEditSession {
  accountId: string
  sessionVersion: number
  controller: AbortController
}

interface EditLock {
  session: BookingEditSession
  bookingId: EntityId
  booking: Promise<Booking>
  needsRecovery: boolean
  saving: boolean
  releasing: boolean
  acquiring: boolean
  release?: Promise<void>
}

const locks = new Map<string, EditLock>()
const sessions = new Map<string, BookingEditSession>()
const releaseTimers = new Map<string, ReturnType<typeof setTimeout>>()
let pageHideBound = false

export function captureBookingEditSession(accountId: EntityId | undefined, sessionVersion: number): BookingEditSession {
  const key = `${sessionVersion}:${accountId ?? ""}`
  let session = sessions.get(key)
  if (!session || session.controller.signal.aborted) {
    session = { accountId: String(accountId ?? ""), sessionVersion, controller: new AbortController() }
    sessions.set(key, session)
  }
  return session
}

function ownsSession(session: BookingEditSession) {
  const current = useAuthStore.getState()
  return Boolean(current.accessToken) && String(current.principal?.id ?? "") === session.accountId && current.sessionVersion === session.sessionVersion
}

export function assertBookingEditSession(session: BookingEditSession) {
  if (!ownsSession(session) || session.controller.signal.aborted) throw new Error("Authentication session changed while editing this booking.")
}

const lockKey = (bookingId: EntityId, session: BookingEditSession) => `${session.sessionVersion}:${session.accountId}:${bookingId}`
// The tab keeps only an account-scoped recovery marker, never draft data or credentials.
const recoveryKey = (bookingId: EntityId, session: BookingEditSession) => `pegaxus-booking-incomplete:${session.accountId}:${bookingId}`

useAuthStore.subscribe(() => {
  for (const [key, session] of sessions) {
    if (!ownsSession(session)) {
      session.controller.abort()
      sessions.delete(key)
    }
  }
  for (const [key, held] of locks) {
    if (!ownsSession(held.session)) {
      clearTimeout(releaseTimers.get(key))
      releaseTimers.delete(key)
      locks.delete(key)
    }
  }
})

async function lock(bookingId: EntityId, session: BookingEditSession): Promise<Booking> {
  assertBookingEditSession(session)
  const config = { signal: session.controller.signal }
  const current = await bookingService.getBooking(bookingId, config)
  assertBookingEditSession(session)
  if (current.status !== "PENDING" && current.status !== "DRAFT") throw new Error("INVALID_BOOKING_STATUS")
  if (current.status === "DRAFT") return current
  await bookingService.changeStatus(bookingId, "DRAFT", config)
  assertBookingEditSession(session)
  const draft = await bookingService.getBooking(bookingId, config)
  assertBookingEditSession(session)
  return draft
}

function bindPageHide() {
  if (pageHideBound) return
  pageHideBound = true
  window.addEventListener("pagehide", () => {
    for (const [key, held] of locks) {
      if (held.needsRecovery || held.saving || held.releasing || held.acquiring || !ownsSession(held.session)) continue
      held.releasing = true
      held.release = bookingService.releaseOnPageHide(held.bookingId, { signal: held.session.controller.signal }).then(() => {
        if (locks.get(key) === held) locks.delete(key)
      }).catch(() => undefined).finally(() => {
        held.releasing = false
        held.release = undefined
      })
    }
  })
}

/** StrictMode shares acquisition; incomplete saves keep their recovery marker across navigation and reload. */
export function acquireEditLock(bookingId: EntityId, session: BookingEditSession): Promise<Booking> {
  assertBookingEditSession(session)
  const key = lockKey(bookingId, session)
  clearTimeout(releaseTimers.get(key))
  releaseTimers.delete(key)
  let held = locks.get(key)
  if (held?.release) return held.release.then(() => acquireEditLock(bookingId, session))
  if (!held || held.session.controller.signal.aborted) {
    bindPageHide()
    const needsRecovery = sessionStorage.getItem(recoveryKey(bookingId, session)) === "1"
    held = { session, bookingId, booking: lock(bookingId, session), needsRecovery, saving: false, releasing: false, acquiring: true }
    locks.set(key, held)
    const acquired = held
    held.booking = held.booking.finally(() => { acquired.acquiring = false })
    held.booking.catch(() => {
      if (locks.get(key) === acquired && !acquired.needsRecovery) locks.delete(key)
    })
  } else if (held.needsRecovery && !held.saving && !held.acquiring) {
    const acquired = held
    acquired.acquiring = true
    acquired.booking = lock(bookingId, session).finally(() => { acquired.acquiring = false })
  }
  return held.booking
}

export function needsBookingSaveRecovery(bookingId: EntityId, session: BookingEditSession) {
  return locks.get(lockKey(bookingId, session))?.needsRecovery ?? false
}

export async function refreshBookingEditLock(bookingId: EntityId, session: BookingEditSession) {
  assertBookingEditSession(session)
  const held = locks.get(lockKey(bookingId, session))
  if (!held) return acquireEditLock(bookingId, session)
  const booking = await bookingService.getBooking(bookingId, { signal: session.controller.signal })
  assertBookingEditSession(session)
  held.booking = Promise.resolve(booking)
  return booking
}

/** Reserve the edit session while checking the server baseline. */
export function beginBookingSave(bookingId: EntityId, session: BookingEditSession) {
  assertBookingEditSession(session)
  const held = locks.get(lockKey(bookingId, session))
  if (!held || held.saving || held.releasing) throw new Error("This booking edit session is not ready to save.")
  held.saving = true
}

/** Protect exit paths only once a write could reach the server. */
export function markBookingSaveWrite(bookingId: EntityId, session: BookingEditSession) {
  assertBookingEditSession(session)
  const held = locks.get(lockKey(bookingId, session))
  if (!held?.saving) throw new Error("This booking edit session is not ready to save.")
  sessionStorage.setItem(recoveryKey(bookingId, session), "1")
  held.needsRecovery = true
}

export function finishBookingSaveAttempt(bookingId: EntityId, session: BookingEditSession) {
  const held = locks.get(lockKey(bookingId, session))
  if (held) held.saving = false
}

/** Leaving restores PENDING only before a save write has been attempted. */
export function releaseEditLock(bookingId: EntityId, session: BookingEditSession): Promise<void> {
  const key = lockKey(bookingId, session)
  const held = locks.get(key)
  if (!held || held.needsRecovery || held.saving || !ownsSession(session)) return Promise.resolve()
  if (held.release) return held.release
  held.releasing = true
  held.release = (async () => {
    await held.booking
    assertBookingEditSession(session)
    if (held.needsRecovery) return
    await bookingService.changeStatus(bookingId, "PENDING", { signal: session.controller.signal })
    assertBookingEditSession(session)
    locks.delete(key)
  })().finally(() => {
    held.releasing = false
    held.release = undefined
    if (ownsSession(session)) void queryClient.invalidateQueries({ queryKey: ["bookings"] })
  })
  return held.release
}

export function scheduleEditRelease(bookingId: EntityId, session: BookingEditSession, delay = 400) {
  const key = lockKey(bookingId, session)
  clearTimeout(releaseTimers.get(key))
  releaseTimers.set(key, setTimeout(() => {
    releaseTimers.delete(key)
    void releaseEditLock(bookingId, session).catch(() => undefined)
  }, delay))
}

/** Only a fully confirmed save may clear the recovery marker. */
export function forgetEditLock(bookingId: EntityId, session: BookingEditSession) {
  assertBookingEditSession(session)
  sessionStorage.removeItem(recoveryKey(bookingId, session))
  const key = lockKey(bookingId, session)
  clearTimeout(releaseTimers.get(key))
  releaseTimers.delete(key)
  locks.delete(key)
}
