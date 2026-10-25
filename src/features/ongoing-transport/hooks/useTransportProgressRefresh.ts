import { useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

export function refreshTransportProgress(
  client: QueryClient,
  transportId: string,
) {
  return client.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "driver-location-assignment" ||
      (query.queryKey[0] === "ongoing-transports" &&
        (query.queryKey[1] === "overview" ||
          query.queryKey[1] === "segments") &&
        query.queryKey.at(-2) === transportId),
  });
}

export function useTransportProgressRefresh(transportId: string | undefined) {
  const client = useQueryClient();
  return useCallback(
    () =>
      transportId
        ? refreshTransportProgress(client, transportId)
        : Promise.resolve(),
    [client, transportId],
  );
}
