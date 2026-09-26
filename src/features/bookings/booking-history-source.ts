export type BookingHistoryMockScenario = "normal" | "empty" | "long" | "error";

export type BookingHistorySource =
  | { kind: "api" }
  | { kind: "mock"; scenario: BookingHistoryMockScenario };

export function resolveBookingHistoryDevToken(
  isDev: boolean,
  accessToken: string | null,
  devToken: string | undefined,
) {
  if (!isDev || accessToken) return undefined;
  return devToken?.trim() || undefined;
}

export function resolveBookingHistorySource(
  isDev: boolean,
  mockParam: string | null,
  scenarioParam: string | null,
): BookingHistorySource {
  if (!isDev || mockParam !== "1") return { kind: "api" };

  const scenario: BookingHistoryMockScenario =
    scenarioParam === "empty" ||
    scenarioParam === "long" ||
    scenarioParam === "error"
      ? scenarioParam
      : "normal";

  return { kind: "mock", scenario };
}

export function bookingHistoryQueryKey(
  bookingId: string,
  source: BookingHistorySource,
) {
  return [
    "bookings",
    bookingId,
    "histories",
    source.kind,
    source.kind === "mock" ? source.scenario : null,
  ] as const;
}
