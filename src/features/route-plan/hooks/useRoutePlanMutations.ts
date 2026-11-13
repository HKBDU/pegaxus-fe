import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { vehicleKeys } from "@/features/fleet/hooks/useVehicles";
import { routeViewKeys } from "@/features/route-view/hooks/useRoutePlanDetail";

import {
  changeVehiclesBeforeDepartureSchema,
  changeVehiclesMidTripSchema,
} from "../schemas";
import {
  changeRoutePlanVehicles,
  getRoutePlanError,
} from "../services";
import type {
  ChangeRoutePlanVehiclesRequest,
  ChangeVehiclesMode,
  ChangeRoutePlanVehiclesResult,
} from "../types";

export interface ChangeRoutePlanVehiclesInput {
  routePlanId: string;
  mode: ChangeVehiclesMode;
  payload: ChangeRoutePlanVehiclesRequest;
}

export function getChangeRoutePlanVehiclesError(error: unknown) {
  const mapped = getRoutePlanError(error);
  return { ...mapped, shouldReload: mapped.code === "ROUTE_PLAN_MODIFIED" };
}

export function useChangeRoutePlanVehicles() {
  const queryClient = useQueryClient();
  const requests = useRef(new Set<AbortController>());
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  useEffect(() => () => {
    for (const controller of requests.current) controller.abort();
  }, []);

  const mutation = useMutation<
    ChangeRoutePlanVehiclesResult,
    Error,
    ChangeRoutePlanVehiclesInput
  >({
    mutationFn: async ({ routePlanId, mode, payload }) => {
      const auth = useAuthStore.getState();
      const accountId = auth.principal?.id;
      const sessionVersion = auth.sessionVersion;
      if (!auth.accessToken || !accountId)
        throw new Error("Sign in and reopen the route plan before changing vehicles.");
      const controller = new AbortController();
      requests.current.add(controller);
      const isCurrent = () => {
        const current = useAuthStore.getState();
        return Boolean(current.accessToken) && current.principal?.id === accountId && current.sessionVersion === sessionVersion;
      };
      const unsubscribe = useAuthStore.subscribe(() => {
        if (!isCurrent()) controller.abort();
      });
      setRefreshWarning(null);
      try {
        const parsed = mode === "before-departure"
          ? changeVehiclesBeforeDepartureSchema.parse(payload)
          : changeVehiclesMidTripSchema.parse(payload);
        const result = await changeRoutePlanVehicles(routePlanId, parsed, controller.signal);
        if (controller.signal.aborted || !isCurrent())
          throw new Error("The account or session changed. Reload the route plan to check the result.");
        // The write is confirmed; unmount may cancel pending writes, not this refresh.
        requests.current.delete(controller);
        // Refresh failures cannot turn a successful PATCH into a failed mutation.
        const refreshed = await Promise.allSettled([
          routeViewKeys.detail(routePlanId),
          ["route-view", "list"],
          ["transport-plans", "list"],
          vehicleKeys.lists(),
          vehicleKeys.details(),
        ].map((queryKey) => Promise.resolve().then(() => isCurrent()
          ? queryClient.invalidateQueries({ queryKey }, { throwOnError: true })
          : undefined)));
        if (controller.signal.aborted || !isCurrent())
          throw new Error("The account or session changed. Reload the route plan to check the result.");
        if (refreshed.some((item) => item.status === "rejected"))
          setRefreshWarning("Vehicle changes were applied, but some data could not be refreshed. Reload before making another change.");
        return result;
      } finally {
        unsubscribe();
        requests.current.delete(controller);
      }
    },
    retry: false,
  });
  return { ...mutation, refreshWarning };
}
