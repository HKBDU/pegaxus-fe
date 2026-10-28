import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import {
  emergencyCostService,
  emergencyCostAuthScope,
  getEmergencyCostError,
  type EmergencyCostActionSubmission,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";
import type { EmergencyCostIncident } from "../schemas";

export function useEmergencyCostAction() {
  const { scope, key, source } = useEmergencyCostScope();
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
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
    mutationKey: [...key, "action"],
    retry: false,
    networkMode: "always",
    mutationFn: async (submission: EmergencyCostActionSubmission) => {
      if (controller.current)
        throw new Error("An emergency cost action is already being submitted.");
      const flight = new AbortController();
      controller.current = flight;
      try {
        return submission.action === "cancel"
          ? await emergencyCostService.cancel(submission, flight.signal, scope)
          : await emergencyCostService.decide(submission, flight.signal, scope);
      } finally {
        if (controller.current === flight) controller.current = null;
      }
    },
    onSuccess: (_result, submission) => {
      if (emergencyCostAuthScope() !== scope) return;
      const incidentId = submission.snapshot.incident.incidentReportId;
      const vehicleId =
        submission.snapshot.incidentSummary?.vehicle?.vehicleId ??
        client.getQueryData<EmergencyCostIncident>([
          ...key,
          "incident-context",
          incidentId,
        ])?.vehicleDetail?.vehicle.vehicleId;
      return Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({
          queryKey: [
            "incident-response",
            "reroute-context",
            source,
            scope,
            submission.snapshot.incident.incidentReportId,
          ],
          exact: true,
        }),
        ...(source === "real" && submission.action === "decision"
          ? [
              // The Incident Detail host refetches through onChanged; avoid a second GET here.
              client.invalidateQueries({
                queryKey: ["incidents"],
                refetchType: "none",
                predicate: ({ queryKey }) =>
                  queryKey[3] === sessionVersion &&
                  (queryKey[1] === "list" ||
                    ((queryKey[1] === "detail" || queryKey[1] === "alert") &&
                      queryKey[2] === incidentId)),
              }),
              client.invalidateQueries({
                queryKey: ["fleet", "vehicles"],
                predicate: ({ queryKey }) =>
                  queryKey[2] === "list" ||
                  (Boolean(vehicleId) &&
                    queryKey[2] === "detail" &&
                    queryKey[3] === vehicleId),
              }),
            ]
          : []),
      ]);
    },
    onError: (error, submission) => {
      const presentation = getEmergencyCostError(error, submission.action);
      if (
        presentation.conflict ||
        (!presentation.outcomeUnknown && presentation.submissionBlocked)
      )
        return client.invalidateQueries({ queryKey: key });
    },
  });
  async function verifyRequest(id: string) {
    if (controller.current)
      throw new Error("Wait for the current operation to finish.");
    const flight = new AbortController();
    controller.current = flight;
    try {
      const result = await emergencyCostService.getDetail(
        id,
        flight.signal,
        scope,
      );
      client.setQueryData([...key, "detail", id], result);
      return result.request;
    } finally {
      if (controller.current === flight) controller.current = null;
    }
  }
  return { ...mutation, verifyRequest };
}
