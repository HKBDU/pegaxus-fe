import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { EntityId } from "@/shared/types";
import {
  buildTransportPlanQuery,
  getTransportPlanError,
  transportPlanService,
} from "../services";
import { actionEntityIdSchema } from "../schemas";
import type {
  CreateTransportPlanInput,
  UpdateTransportPlanInput,
  TransportPlanDetail,
  TransportPlansQueryParams,
} from "../types";
import { approvedBookingKeys } from "./useApprovedBookings";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";

export const transportPlanKeys = {
  all: ["transport-plans"] as const,
  list: (params: TransportPlansQueryParams) =>
    ["transport-plans", "list", buildTransportPlanQuery(params)] as const,
  detail: (id: EntityId) => ["transport-plans", "detail", String(id)] as const,
  quotation: (id: EntityId) =>
    ["transport-plans", "quotation", String(id)] as const,
  assignments: (id: EntityId) =>
    ["transport-plans", "assignments", String(id)] as const,
};
const retry = (count: number, error: Error) =>
  count < 1 && getTransportPlanError(error).retryable;
export function useTransportPlans(
  params: TransportPlansQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: transportPlanKeys.list(params),
    queryFn: ({ signal }) => transportPlanService.getPlans(params, signal),
    enabled,
    retry,
  });
}
export function useTransportPlan(id: EntityId, enabled = true) {
  return useQuery({
    queryKey: transportPlanKeys.detail(id),
    queryFn: ({ signal }) => transportPlanService.getPlan(id, signal),
    enabled: enabled && actionEntityIdSchema.safeParse(id).success,
    retry,
  });
}
export async function refreshTransportPlanQueries(
  client: QueryClient,
  plan: TransportPlanDetail,
) {
  client.setQueryData(transportPlanKeys.detail(plan.transportPlanId), plan);
  await Promise.all([
    client.invalidateQueries({ queryKey: ["transport-plans", "list"] }),
    client.invalidateQueries({
      queryKey: transportPlanKeys.detail(plan.transportPlanId),
    }),
    client.invalidateQueries({ queryKey: ["approved-bookings", "list"] }),
    client.invalidateQueries({
      queryKey: approvedBookingKeys.detail(plan.booking.bookingId),
    }),
    client.invalidateQueries({ queryKey: ["bookings", "list"] }),
    client.invalidateQueries({
      queryKey: ["bookings", "detail", plan.booking.bookingId],
    }),
  ]);
}
export function useCreateTransportPlan(bookingId: string) {
  const client = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  return useMutation({
    mutationKey: ["transport-plans", "create", bookingId],
    mutationFn: (input: CreateTransportPlanInput) => {
      if (!canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }))
        throw new Error("Only Logistics Managers can create transport plans.");
      return transportPlanService.createPlan(bookingId, input);
    },
    onSuccess: (plan) => refreshTransportPlanQueries(client, plan),
  });
}
export function useUpdateTransportPlan(id: string) {
  const client = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  return useMutation({
    mutationFn: (input: UpdateTransportPlanInput) => {
      if (!canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }))
        throw new Error("Only Logistics Managers can edit transport plans.");
      return transportPlanService.updatePlan(id, input);
    },
    onSuccess: (plan) => refreshTransportPlanQueries(client, plan),
  });
}
