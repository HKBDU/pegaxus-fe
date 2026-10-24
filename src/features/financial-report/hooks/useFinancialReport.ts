import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  transportIdSchema,
  type FinancialReport,
  type UpdateFinancialNote,
} from "../schemas";
import {
  financialReportService,
  FinancialReportError,
  hasFinancialAccess,
} from "../services";

export function useFinancialAccess() {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  return {
    allowed:
      signedIn && canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }),
    scope: JSON.stringify([principal?.id ?? null, sessionVersion]),
  };
}

export function useFinancialReport(
  transportId: string,
  allowProvisional: boolean,
) {
  const { allowed, scope } = useFinancialAccess();
  const client = useQueryClient();
  const baseKey = [
    "financial-report",
    scope,
    transportId.toLowerCase(),
  ] as const;
  const queryKey = [...baseKey, allowProvisional] as const;
  const flight = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      if (!hasFinancialAccess(scope)) flight.current?.abort();
    });
    return () => {
      mounted.current = false;
      flight.current?.abort();
      unsubscribe();
    };
  }, [scope]);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      financialReportService.get(transportId, allowProvisional, scope, signal),
    enabled: allowed && transportIdSchema.safeParse(transportId).success,
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: "always",
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === scope &&
      previousQuery.queryKey[2] === transportId.toLowerCase()
        ? previous
        : undefined,
  });

  async function run(send: (signal: AbortSignal) => Promise<FinancialReport>) {
    if (flight.current)
      throw new FinancialReportError(
        "REQUEST_PENDING",
        "A financial request is already in progress.",
      );
    const controller = new AbortController();
    flight.current = controller;
    try {
      return await send(controller.signal);
    } finally {
      if (flight.current === controller) flight.current = null;
    }
  }

  async function confirmed(report: FinancialReport) {
    if (!mounted.current || !hasFinancialAccess(scope)) return;
    await client.cancelQueries({ queryKey: baseKey });
    if (!mounted.current || !hasFinancialAccess(scope)) return;
    // Both consent modes describe the same transport once a persisted response is confirmed.
    client.setQueriesData({ queryKey: baseKey }, report);
  }

  const refresh = useMutation({
    mutationFn: () =>
      run((signal) =>
        financialReportService.refresh(transportId, scope, signal),
      ),
    onSuccess: confirmed,
    retry: false,
    networkMode: "always",
  });
  const save = useMutation({
    mutationFn: (payload: UpdateFinancialNote) =>
      run((signal) =>
        financialReportService.updateNote(transportId, payload, scope, signal),
      ),
    onSuccess: confirmed,
    retry: false,
    networkMode: "always",
  });

  return { query, refresh, save, allowed };
}
