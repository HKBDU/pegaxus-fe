import { useCallback, useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { HandoverRecord } from "@/features/handover/types";

export function refreshTransportProgress(
  client: QueryClient,
  transportId: string,
) {
  return client.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "ongoing-transports" &&
      (query.queryKey[1] === "overview" || query.queryKey[1] === "segments") &&
      query.queryKey.at(-2) === transportId,
  });
}

export function useTransportProgressRefresh(transportId: string | undefined) {
  const client = useQueryClient();
  useEffect(() => {
    const revisions = new Map<string, string>();
    return client.getQueryCache().subscribe((event) => {
      if (
        !transportId ||
        event.type !== "updated" ||
        event.action.type !== "success" ||
        event.query.queryKey[0] !== "handover" ||
        event.query.queryKey[1] !== "record"
      )
        return;
      const record = event.query.state.data as HandoverRecord | undefined;
      if (
        record?.transport?.transportId !== transportId ||
        record.status !== "COMPLETED" ||
        !record.handoverRecordId ||
        !record.updatedAt
      )
        return;
      if (revisions.get(record.handoverRecordId) === record.updatedAt) return;
      revisions.set(record.handoverRecordId, record.updatedAt);
      void refreshTransportProgress(client, transportId);
    });
  }, [client, transportId]);
  return useCallback(
    () =>
      transportId
        ? refreshTransportProgress(client, transportId)
        : Promise.resolve(),
    [client, transportId],
  );
}
