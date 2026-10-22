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

export function useEmergencyCostAction() {
  const { scope, key, source } = useEmergencyCostScope();
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
    onSuccess: (_result, submission) =>
      Promise.all([
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
      ]),
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
