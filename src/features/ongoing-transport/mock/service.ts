import { AxiosError } from "axios";
import type { MockScenario, OngoingTransportParams } from "../types";
import { ongoingTransportFixtures } from "./fixtures";

export function waitForMockRequest(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 450);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function getMockOngoingTransports(
  params: OngoingTransportParams,
  scenario: MockScenario,
  signal?: AbortSignal,
) {
  await waitForMockRequest(signal);
  signal?.throwIfAborted();
  if (scenario === "network-error")
    throw new AxiosError(
      "Development preview: network unavailable",
      "ERR_NETWORK",
    );
  if (scenario === "api-error")
    return {
      isSuccess: false,
      code: 500,
      errorCode: "SYSTEM_ERROR",
      message: "Development preview: API failure",
      value: null,
    };
  const search = params.search?.trim().toLocaleLowerCase();
  const statuses = params.status.split(",");
  const items = (scenario === "empty" ? [] : ongoingTransportFixtures).filter(
    (item) =>
      statuses.includes(item.status) &&
      (!params.hasActiveIncident || item.activeIncidentCount > 0) &&
      (!search ||
        [item.transportCode, item.bookingCode, item.customerName].some(
          (value) => value.toLocaleLowerCase().includes(search),
        )),
  );
  items.sort((a, b) => {
    if (params.sortBy !== "transportCode:asc") {
      if (a.departureAt === null && b.departureAt !== null) return 1;
      if (b.departureAt === null && a.departureAt !== null) return -1;
    }
    const comparison =
      params.sortBy === "transportCode:asc"
        ? a.transportCode.localeCompare(b.transportCode)
        : a.departureAt !== null && b.departureAt !== null
          ? Date.parse(a.departureAt) - Date.parse(b.departureAt)
          : 0;
    return (
      (params.sortBy === "departureAt:desc" ? -comparison : comparison) ||
      a.transportId.localeCompare(b.transportId)
    );
  });
  return {
    isSuccess: true,
    code: 200,
    message: "Ongoing transports retrieved successfully",
    value: {
      serverTime: new Date().toISOString(),
      items: items.slice(
        params.pageIndex * params.pageSize,
        (params.pageIndex + 1) * params.pageSize,
      ),
      pageIndex: params.pageIndex,
      pageSize: params.pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / params.pageSize),
    },
  };
}
