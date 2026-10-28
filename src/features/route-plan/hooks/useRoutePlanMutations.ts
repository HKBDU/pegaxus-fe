import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  return useMutation<
    ChangeRoutePlanVehiclesResult,
    Error,
    ChangeRoutePlanVehiclesInput
  >({
    mutationFn: ({ routePlanId, mode, payload }) => {
      const parsed = mode === "before-departure"
        ? changeVehiclesBeforeDepartureSchema.parse(payload)
        : changeVehiclesMidTripSchema.parse(payload);
      return changeRoutePlanVehicles(routePlanId, parsed);
    },
    retry: false,
    onSuccess: async (_, { routePlanId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: routeViewKeys.detail(routePlanId) }),
        queryClient.invalidateQueries({ queryKey: ["route-view", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["transport-plans", "list"] }),
        queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: vehicleKeys.details() }),
      ]);
    },
  });
}
