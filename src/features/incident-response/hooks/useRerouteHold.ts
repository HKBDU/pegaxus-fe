import { useEffect, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { emergencyCostAuthScope } from "../services";
import {
  getRerouteContext,
  getRerouteHoldError,
  holdReroute,
} from "../reroute-services";
import type { RerouteContext, RerouteHoldRequest } from "../reroute-schemas";

export function useRerouteHold(scope: string, queryKey: QueryKey) {
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(() => {
      if (emergencyCostAuthScope() !== scope) controller.current?.abort();
    });
    return () => {
      unsubscribe();
      controller.current?.abort();
    };
  }, [scope]);
  const mutation = useMutation({
    mutationKey: [...queryKey, "hold"],
    retry: false,
    networkMode: "always",
    mutationFn: async ({
      context,
      request,
    }: {
      context: RerouteContext;
      request: RerouteHoldRequest;
    }) => {
      if (controller.current)
        throw new Error("A hold operation is already in progress.");
      const flight = new AbortController();
      controller.current = flight;
      try {
        return await holdReroute(context, request, scope, flight.signal);
      } finally {
        if (controller.current === flight) controller.current = null;
      }
    },
    onSuccess: () => {
      if (emergencyCostAuthScope() === scope)
        toast.success("Hold & Wait decision recorded.");
      return client.invalidateQueries({ queryKey, exact: true });
    },
    onError: (error) => {
      if (getRerouteHoldError(error).refreshContext)
        return client.invalidateQueries({ queryKey, exact: true });
    },
  });
  async function verifyContext(incidentId: string) {
    if (controller.current)
      throw new Error("Wait for the current operation to finish.");
    const flight = new AbortController();
    controller.current = flight;
    try {
      const context = await getRerouteContext(incidentId, scope, flight.signal);
      // Only a validated, authorized GET result replaces the cache; a failed read must not discard the draft.
      client.setQueryData(queryKey, context);
      return context;
    } finally {
      if (controller.current === flight) controller.current = null;
    }
  }
  return { ...mutation, verifyContext };
}
