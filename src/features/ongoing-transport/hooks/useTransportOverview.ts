import { useQuery } from "@tanstack/react-query";
import { getOngoingTransportError, ongoingTransportService } from "../services";
import type { OverviewScenario, TransportAudience } from "../types";
import { useTransportQueryContext } from "./useTransportQueryContext";

export function useTransportOverview(
  transportId: string | undefined,
  bookingId: string | undefined,
  audience: TransportAudience,
  scenario: OverviewScenario,
  poll = true,
) {
  const context = useTransportQueryContext(true);
  const query = useQuery({
    queryKey: [
      "ongoing-transports",
      "overview",
      ...context.scope,
      audience,
      bookingId,
      transportId,
      context.mode === "mock" ? scenario : "data",
    ],
    queryFn: ({ signal }) =>
      ongoingTransportService.overview(
        transportId!,
        audience,
        scenario,
        signal,
      ),
    enabled: context.enabled && transportId !== undefined,
    refetchInterval: poll && context.visible ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: poll,
    staleTime: 15_000,
    retry: (count, error) =>
      count < 1 && getOngoingTransportError(error, "overview").retryable,
  });
  return { ...query, online: context.online };
}
