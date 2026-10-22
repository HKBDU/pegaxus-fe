import { useEffect, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { toast } from "sonner";
import { emergencyCostAuthScope } from "../services";
import {
  escalateReroute,
  getRerouteEscalationError,
} from "../reroute-services";
import type {
  RerouteContext,
  RerouteEscalationRequest,
} from "../reroute-schemas";

export function useRerouteEscalation(scope: string, queryKey: QueryKey) {
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
  return useMutation({
    mutationKey: [...queryKey, "escalate"],
    retry: false,
    networkMode: "always",
    mutationFn: async ({
      context,
      request,
    }: {
      context: RerouteContext;
      request: RerouteEscalationRequest;
    }) => {
      if (controller.current)
        throw new Error("An escalation is already being submitted.");
      const flight = new AbortController();
      controller.current = flight;
      try {
        return await escalateReroute(context, request, scope, flight.signal);
      } finally {
        if (controller.current === flight) controller.current = null;
      }
    },
    onSuccess: () => {
      if (emergencyCostAuthScope() === scope)
        toast.success("Escalation sent to Logistics Management.");
      return client.invalidateQueries({ queryKey, exact: true });
    },
    onError: (error) => {
      if (getRerouteEscalationError(error).refreshContext)
        return client.invalidateQueries({ queryKey, exact: true });
    },
  });
}
