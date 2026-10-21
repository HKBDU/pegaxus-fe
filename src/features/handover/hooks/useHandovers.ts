import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { handoverService, HandoverApiError } from "../services";
import { canOperateHandover, handoverCreateModes } from "../utils";
import type {
  CancelInput,
  CompleteInput,
  CreateHandoverInput,
  HandoverRecord,
  ListFilters,
} from "../types";

const keys = {
  all: ["handover"] as const,
  list: (transportId: string, filters: ListFilters) =>
    [
      "handover",
      "list",
      transportId,
      filters.handoverType ?? "",
      filters.status ?? "",
    ] as const,
  record: (handoverRecordId: string) =>
    ["handover", "record", handoverRecordId] as const,
  segments: (transportId: string) =>
    ["handover", "segments", transportId] as const,
};

const identity = () =>
  `${useAuthStore.getState().sessionVersion}:${useAuthStore.getState().principal?.id ?? ""}`;
function useIdentity() {
  const session = useAuthStore((state) => state.sessionVersion);
  const account = useAuthStore((state) => state.principal?.id);
  return `${session}:${account ?? ""}`;
}

/** Errors that a retry cannot fix: stop asking and show the message. */
const retryOnlyNetwork = (failureCount: number, error: unknown) =>
  failureCount < 2 &&
  (error as { errorCode?: string })?.errorCode === "NETWORK_ERROR";

/** HO1. */
export function useHandoverList(transportId: string, filters: ListFilters) {
  const session = useIdentity();
  return useQuery({
    queryKey: [...keys.list(transportId, filters), session],
    queryFn: ({ signal }) =>
      handoverService.listByTransport(transportId, filters, signal),
    placeholderData: (previous, query) =>
      query?.queryKey.at(-1) === session
        ? keepPreviousData(previous)
        : undefined,
    retry: retryOnlyNetwork,
  });
}

/** HO2. */
export function useHandoverRecord(handoverRecordId: string | undefined) {
  const session = useIdentity();
  return useQuery({
    queryKey: [...keys.record(handoverRecordId ?? ""), session],
    queryFn: ({ signal }) =>
      handoverService.getRecord(handoverRecordId as string, signal),
    enabled: Boolean(handoverRecordId),
    retry: retryOnlyNetwork,
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
    gcTime: 0,
  });
}

/** OT4 (read only): boundaries for the "start" page and the coordinates of the handover point. */
export function useTransportSegments(transportId: string, enabled = true) {
  const session = useIdentity();
  return useQuery({
    queryKey: [...keys.segments(transportId), session],
    queryFn: ({ signal }) => handoverService.getSegments(transportId, signal),
    enabled,
    retry: retryOnlyNetwork,
  });
}

/** After any write the record and every list of the transport are stale (status, availableActions, boundaries). */
function useAfterWrite(transportId: string) {
  const client = useQueryClient();
  return (record?: HandoverRecord) => {
    if (record)
      client.setQueryData(
        [...keys.record(record.handoverRecordId), identity()],
        record,
      );
    void client.invalidateQueries({
      queryKey: [...keys.all, "list", transportId],
    });
    void client.invalidateQueries({ queryKey: keys.segments(transportId) });
    void client.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "driver-location-assignment" ||
        (query.queryKey[0] === "ongoing-transports" &&
          ["overview", "segments"].includes(String(query.queryKey[1])) &&
          query.queryKey.includes(transportId)),
    });
  };
}

function useHandoverMutation<T>(
  transportId: string,
  request: (
    input: T,
    signal: AbortSignal,
    assertCurrent: () => void,
  ) => Promise<HandoverRecord>,
  recordId = "",
) {
  const session = useIdentity();
  const scope = `${session}:${transportId}:${recordId}`;
  const currentScope = useRef(scope);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const after = useAfterWrite(transportId);
  useLayoutEffect(() => {
    currentScope.current = scope;
    mounted.current = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      if (identity() !== session) controller.current?.abort();
    });
    return () => {
      generation.current += 1;
      mounted.current = false;
      unsubscribe();
      controller.current?.abort();
    };
  }, [session, scope]);
  return useMutation({
    mutationKey: ["handover-write", scope],
    onMutate: () => ({ scope, generation: generation.current }),
    retry: false,
    networkMode: "always",
    gcTime: 0,
    mutationFn: async (input: T) => {
      if (
        !mounted.current ||
        controller.current ||
        currentScope.current !== scope ||
        identity() !== session ||
        !navigator.onLine
      )
        throw new HandoverApiError({
          message:
            "Connect to the network and try again in the current session.",
        });
      const active = new AbortController();
      const activeGeneration = generation.current;
      const assertCurrent = () => {
        if (
          !mounted.current ||
          active.signal.aborted ||
          identity() !== session ||
          currentScope.current !== scope ||
          generation.current !== activeGeneration
        ) {
          active.abort();
          throw new HandoverApiError({
            errorCode: "CANCELED",
            message: "Request canceled because the handover page changed.",
          });
        }
      };
      controller.current = active;
      try {
        assertCurrent();
        const record = await request(input, active.signal, assertCurrent);
        assertCurrent();
        return record;
      } finally {
        if (controller.current === active) controller.current = null;
      }
    },
    onSuccess: (record, _input, context) => {
      if (
        mounted.current &&
        identity() === session &&
        currentScope.current === scope &&
        context?.generation === generation.current &&
        context.scope === scope
      )
        after(record);
      else
        throw new HandoverApiError({
          errorCode: "CANCELED",
          message: "Request canceled because the handover page changed.",
        });
    },
  });
}

export function useCreateHandover(transportId: string) {
  return useHandoverMutation(
    transportId,
    async (input: CreateHandoverInput, signal, assertCurrent) => {
      const overview = await handoverService.getSegments(transportId, signal);
      assertCurrent();
      const boundary = overview.handoverBoundaries.find(
        (entry) =>
          (entry.fromRoutePlanRouteId ?? null) ===
            (input.fromRoutePlanRouteId ?? null) &&
          (entry.toRoutePlanRouteId ?? null) ===
            (input.toRoutePlanRouteId ?? null),
      );
      const mode = input.startNow ? "START_NOW" : "SCHEDULE";
      if (boundary?.existingHandover)
        throw new HandoverApiError({
          errorCode: "HANDOVER_ALREADY_EXISTS",
          message: "This handover point already has a record.",
          value: {
            handoverRecordId: boundary.existingHandover.handoverRecordId,
          },
        });
      if (
        !boundary ||
        !boundary.allowedHandoverTypes.includes(input.handoverType) ||
        !handoverCreateModes(
          boundary,
          new Map(overview.segments.map((leg) => [leg.routePlanRouteId, leg])),
          useAuthStore.getState().principal,
        ).includes(mode)
      )
        throw new HandoverApiError({
          message:
            "This handover mode is no longer available. Reload the handover points.",
        });
      return handoverService.create(transportId, input, signal, assertCurrent);
    },
  );
}

export function useStartHandover(transportId: string, recordId = "") {
  return useHandoverMutation(
    transportId,
    async (handoverRecordId: string, signal, assertCurrent) => {
      if (
        !canOperateHandover(useAuthStore.getState().principal) ||
        canAccess(useAuthStore.getState().principal, {
          anyRole: ["TRANSPORT_SPECIALIST"],
        })
      )
        throw new HandoverApiError({
          message: "You cannot start this handover.",
        });
      const record = await handoverService.getRecord(handoverRecordId, signal);
      assertCurrent();
      if (
        record.status !== "PLANNED" ||
        !record.availableActions.includes("START")
      )
        throw new HandoverApiError({
          errorCode: "INVALID_HANDOVER_STATUS",
          message: "This handover cannot be started.",
        });
      return handoverService.start(handoverRecordId, signal, assertCurrent);
    },
    recordId,
  );
}

export function useCompleteHandover(
  transportId: string,
  handoverRecordId: string,
) {
  return useHandoverMutation(
    transportId,
    (input: CompleteInput, signal, assertCurrent) => {
      if (
        !canOperateHandover(useAuthStore.getState().principal) ||
        canAccess(useAuthStore.getState().principal, {
          anyRole: ["TRANSPORT_SPECIALIST"],
        })
      )
        throw new HandoverApiError({
          message: "You cannot complete this handover.",
        });
      return handoverService.complete(
        handoverRecordId,
        input,
        signal,
        assertCurrent,
      );
    },
    handoverRecordId,
  );
}

export function useCancelHandover(
  transportId: string,
  handoverRecordId: string,
) {
  return useHandoverMutation(
    transportId,
    (input: CancelInput, signal, assertCurrent) =>
      handoverService.cancel(handoverRecordId, input, signal, assertCurrent),
    handoverRecordId,
  );
}

/** Reload after `HANDOVER_MODIFIED`: fetch the record again and refresh the lists. */
export function useReloadHandover(
  transportId: string,
  handoverRecordId: string,
) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: keys.record(handoverRecordId) });
    void client.invalidateQueries({
      queryKey: [...keys.all, "list", transportId],
    });
  };
}
