import { useEffect, useRef, useState } from "react";
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import type {
  CreatePriceListHeaderInput,
  UpdatePriceListHeaderInput,
  PriceListHeader,
} from "../header.schemas";
import {
  activatePriceList,
  clonePriceList,
  createPriceList,
  updatePriceList,
  canManagePriceListHeaders,
  priceListHeaderScope,
  PriceListHeaderApiError,
  getPriceListHeaderError,
} from "../services/header";

const flights = new Set<string>();
export function usePriceListHeaderAccess() {
  useAuthStore((state) => state.principal);
  useAuthStore((state) => state.sessionVersion);
  useAuthStore((state) => Boolean(state.accessToken));
  return {
    allowed: canManagePriceListHeaders(),
    scope: priceListHeaderScope(),
  };
}
function useHeaderMutation<V>(
  operation: string,
  id: string,
  submit: (
    value: V,
    signal: AbortSignal,
    scope: string,
  ) => Promise<PriceListHeader>,
) {
  const { allowed, scope } = usePriceListHeaderAccess();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const [retryAt, setRetryAt] = useState(0);
  const key = ["price-lists", "header-mutation", scope, operation, id];
  const sharedPending = useIsMutating({ mutationKey: key }) > 0;
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      if (scope !== priceListHeaderScope()) controller.current?.abort();
    });
    return () => {
      mounted.current = false;
      unsubscribe();
      controller.current?.abort();
    };
  }, [scope]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(
      () => setRetryAt(0),
      Math.min(Math.max(0, retryAt - Date.now()), 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [retryAt]);
  const mutation = useMutation({
    mutationKey: key,
    retry: false,
    networkMode: "always",
    mutationFn: async (value: V) => {
      const flightKey = JSON.stringify(key);
      if (controller.current || flights.has(flightKey))
        throw new PriceListHeaderApiError("REQUEST_PENDING");
      if (retryAt > Date.now())
        throw new PriceListHeaderApiError("TOO_MANY_REQUESTS", 429);
      const flight = new AbortController();
      controller.current = flight;
      flights.add(flightKey);
      try {
        return await submit(value, flight.signal, scope);
      } finally {
        flights.delete(flightKey);
        if (controller.current === flight) controller.current = null;
      }
    },
    onSuccess: () => {
      if (mounted.current && scope === priceListHeaderScope())
        void client.invalidateQueries({ queryKey: ["price-lists"] });
    },
    onError: (error) => {
      if (!mounted.current || scope !== priceListHeaderScope()) return;
      const failure = getPriceListHeaderError(error);
      if (failure.retryAfterSeconds)
        setRetryAt(Date.now() + failure.retryAfterSeconds * 1000);
      if (failure.errorCode === "ACTIVE_PRICELIST_LOCKED")
        void client.invalidateQueries({ queryKey: ["price-lists"] });
    },
  });
  return {
    ...mutation,
    isPending: mutation.isPending || sharedPending,
    rateLimited: retryAt > 0,
    allowed,
    scope,
    isCurrent: () => mounted.current && scope === priceListHeaderScope(),
  };
}
export function useCreatePriceList() {
  return useHeaderMutation(
    "create",
    "",
    (input: CreatePriceListHeaderInput, signal, scope) =>
      createPriceList(input, signal, scope),
  );
}
export function useUpdatePriceList(id: string) {
  return useHeaderMutation(
    "update",
    id,
    (input: UpdatePriceListHeaderInput, signal, scope) =>
      updatePriceList(id, input, signal, scope),
  );
}
export function useActivatePriceList(id: string) {
  return useHeaderMutation("activate", id, (_input: void, signal, scope) =>
    activatePriceList(id, signal, scope),
  );
}
export function useClonePriceList(id: string) {
  return useHeaderMutation("clone", id, (_input: void, signal, scope) =>
    clonePriceList(id, signal, scope),
  );
}
