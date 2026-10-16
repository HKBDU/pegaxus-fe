import { bookingService } from "@/features/booking/services"
import type { Booking } from "@/features/booking/types"
import { queryClient } from "@/lib/queryClient"
import type { EntityId } from "@/shared/types"

/**
 * Editing a booking "locks" it: opening the edit page moves PENDING -> DRAFT so a manager cannot approve it
 * while the customer is editing. Save moves it back to PENDING (the manager reviews it again), and so does
 * leaving the page without saving (Cancel, another page, closing the tab).
 */
const locks = new Map<string, Promise<Booking>>()
const releaseTimers = new Map<string, ReturnType<typeof setTimeout>>()
let pageHideBound = false

async function lock(bookingId: EntityId): Promise<Booking> {
  const current = await bookingService.getBooking(bookingId)
  if (current.status !== "PENDING" && current.status !== "DRAFT") throw new Error("INVALID_BOOKING_STATUS")
  if (current.status === "DRAFT") return current
  await bookingService.changeStatus(bookingId, "DRAFT")
  return bookingService.getBooking(bookingId) // the status change bumped updatedAt
}

function bindPageHide() {
  if (pageHideBound) return
  pageHideBound = true
  window.addEventListener("pagehide", () => {
    for (const id of locks.keys()) bookingService.releaseOnPageHide(id)
  })
}

/** One lock request per booking, shared by every caller (React StrictMode mounts the edit page twice in dev). */
export function acquireEditLock(bookingId: EntityId): Promise<Booking> {
  const key = String(bookingId)
  clearTimeout(releaseTimers.get(key))
  releaseTimers.delete(key)

  let held = locks.get(key)
  if (!held) {
    bindPageHide()
    held = lock(bookingId)
    locks.set(key, held)
    held.catch(() => {
      if (locks.get(key) === held) locks.delete(key)
    })
  }
  return held
}

/** Back to PENDING. Safe to call more than once: only the first call after a lock does anything. */
export async function releaseEditLock(bookingId: EntityId): Promise<void> {
  const key = String(bookingId)
  const held = locks.get(key)
  if (!held) return
  locks.delete(key)
  try {
    await held
    await bookingService.changeStatus(bookingId, "PENDING")
  } catch {
    // the lock was never taken, or the booking is no longer a draft
  } finally {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] })
  }
}

/** Called when the edit page unmounts. Delayed so StrictMode's fake unmount/mount does not release the lock. */
export function scheduleEditRelease(bookingId: EntityId, delay = 400) {
  const key = String(bookingId)
  clearTimeout(releaseTimers.get(key))
  releaseTimers.set(
    key,
    setTimeout(() => {
      releaseTimers.delete(key)
      void releaseEditLock(bookingId)
    }, delay),
  )
}

/** The save flow already moved the booking back to PENDING itself, so there is nothing left to release. */
export function forgetEditLock(bookingId: EntityId) {
  locks.delete(String(bookingId))
}
