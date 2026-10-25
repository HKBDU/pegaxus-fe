import { useQuery } from "@tanstack/react-query";
import {
  buildOngoingTransportQuery,
  getOngoingTransportError,
  ongoingTransportService,
} from "../services";
import { isOngoingTransportMockMode } from "../source";
import type { MockScenario, OngoingTransportParams } from "../types";
import { useTransportQueryContext } from "./useTransportQueryContext";

export const ongoingTransportKeys = {
  all: ["ongoing-transports"] as const,
  list: (params: OngoingTransportParams, scenario: MockScenario) =>
    [
      "ongoing-transports",
      isOngoingTransportMockMode() ? "mock" : "real",
      isOngoingTransportMockMode() ? scenario : "data",
      buildOngoingTransportQuery(params),
    ] as const,
};

export function useOngoingTransports(
  params: OngoingTransportParams,
  enabled: boolean,
  scenario: MockScenario,
) {
  const context = useTransportQueryContext();
  const queryKey = [
    ...ongoingTransportKeys.list(params, scenario),
    ...context.scope,
  ];
  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      ongoingTransportService.list(params, signal, scenario),
    enabled: enabled && context.enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === queryKey[1] &&
      previousQuery?.queryKey[2] === queryKey[2] &&
      JSON.stringify(previousQuery?.queryKey.slice(4)) ===
        JSON.stringify(queryKey.slice(4))
        ? previous
        : undefined,
    retry: (failureCount, error) =>
      failureCount < 1 && getOngoingTransportError(error).retryable,
    staleTime: 30_000,
  });
}
