import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingHistoryQueryKey,
  resolveBookingHistoryDevToken,
  resolveBookingHistorySource,
} from "../src/features/bookings/booking-history-source.ts";

test("mock mode is available only in development", () => {
  assert.deepEqual(resolveBookingHistorySource(true, "1", null), {
    kind: "mock",
    scenario: "normal",
  });
  assert.deepEqual(resolveBookingHistorySource(false, "1", "error"), {
    kind: "api",
  });
  assert.deepEqual(resolveBookingHistorySource(true, null, "error"), {
    kind: "api",
  });
});

test("only supported mock scenarios affect source selection", () => {
  assert.deepEqual(resolveBookingHistorySource(true, "1", "empty"), {
    kind: "mock",
    scenario: "empty",
  });
  assert.deepEqual(resolveBookingHistorySource(true, "1", "long"), {
    kind: "mock",
    scenario: "long",
  });
  assert.deepEqual(resolveBookingHistorySource(true, "1", "error"), {
    kind: "mock",
    scenario: "error",
  });
  assert.deepEqual(resolveBookingHistorySource(true, "1", "unknown"), {
    kind: "mock",
    scenario: "normal",
  });
});

test("query keys separate API data from every mock scenario", () => {
  const api = bookingHistoryQueryKey("123", { kind: "api" });
  const mock = bookingHistoryQueryKey("123", {
    kind: "mock",
    scenario: "normal",
  });
  const empty = bookingHistoryQueryKey("123", {
    kind: "mock",
    scenario: "empty",
  });
  assert.notDeepEqual(api, mock);
  assert.notDeepEqual(mock, empty);
  assert.notDeepEqual(api, bookingHistoryQueryKey("456", { kind: "api" }));
});

test("development token applies only without an authenticated token", () => {
  assert.equal(resolveBookingHistoryDevToken(true, null, "  dev-token  "), "dev-token");
  assert.equal(resolveBookingHistoryDevToken(true, "session-token", "dev-token"), undefined);
  assert.equal(resolveBookingHistoryDevToken(false, null, "dev-token"), undefined);
  assert.equal(resolveBookingHistoryDevToken(true, null, "  "), undefined);
});
