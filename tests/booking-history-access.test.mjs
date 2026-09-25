import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBookingHistoryShell } from "../src/features/bookings/booking-history-access.ts";

test("customer-only roles use the customer shell", () => {
  assert.equal(resolveBookingHistoryShell(["CUSTOMER"]), "customer");
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
