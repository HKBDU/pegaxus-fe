import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingHistoryDetailsPath,
  resolveBookingHistoryShell,
} from "../src/features/bookings/booking-history-access.ts";

test("customer-only roles use the customer shell", () => {
  assert.equal(resolveBookingHistoryShell(["CUSTOMER"]), "customer");
  assert.equal(resolveBookingHistoryShell(["ROLE_CUSTOMER"]), "customer");
  assert.equal(resolveBookingHistoryShell([" customer "]), "customer");
});

test("any employee role uses the admin shell", () => {
  assert.equal(resolveBookingHistoryShell(["ADMIN"]), "admin");
  assert.equal(resolveBookingHistoryShell(["LOGISTICS_MANAGER"]), "admin");
  assert.equal(resolveBookingHistoryShell(["CUSTOMER", "LOGISTICS_MANAGER"]), "admin");
});

test("missing roles do not select a shell", () => {
  assert.equal(resolveBookingHistoryShell([]), null);
  assert.equal(resolveBookingHistoryShell(undefined), null);
  assert.equal(resolveBookingHistoryShell([""]), null);
});

test("history returns to the matching booking details route", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.equal(bookingHistoryDetailsPath(id, "customer"), `/bookings/${id}`);
  assert.equal(bookingHistoryDetailsPath(id, "admin"), `/admin/transport-requests/${id}`);
});
