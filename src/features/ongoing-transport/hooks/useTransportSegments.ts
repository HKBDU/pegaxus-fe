import { useQuery } from "@tanstack/react-query";
import { getOngoingTransportError, ongoingTransportService } from "../services";
import type { SegmentsScenario, TransportAudience } from "../types";
import { useTransportQueryContext } from "./useTransportQueryContext";

export function useTransportSegments(
  transportId: string | undefined,
  bookingId: string | undefined,
  audience: TransportAudience,
  scenario: SegmentsScenario,
  enabled = true,
) {
  const context = useTransportQueryContext(true);
  const query = useQuery({
    queryKey: [
      "ongoing-transports",
      "segments",
      ...context.scope,
      audience,
      bookingId,
      transportId,
      context.mode === "mock" ? scenario : "data",
    ],
    queryFn: ({ signal }) =>
      ongoingTransportService.segments(
        transportId!,
        audience,
        scenario,
        signal,
      ),
    enabled: enabled && context.enabled && transportId !== undefined,
    refetchInterval: context.visible ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: (count, error) =>
      count < 1 && getOngoingTransportError(error, "segments").retryable,
  });
  return { ...query, online: context.online };
}
