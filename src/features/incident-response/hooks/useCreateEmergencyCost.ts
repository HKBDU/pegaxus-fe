import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import {
  emergencyCostService,
  emergencyCostAuthScope,
  type CreateEmergencyCostSubmission,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useCreateEmergencyCost() {
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
  return useMutation({
    mutationKey: [...key, "create"],
    retry: false,
    networkMode: "always",
    mutationFn: async (submission: CreateEmergencyCostSubmission) => {
      if (controller.current)
        throw new Error("A cost request is already being submitted.");
      const flight = new AbortController();
      controller.current = flight;
      try {
        return await emergencyCostService.create(
          submission,
          flight.signal,
          scope,
        );
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
            submission.incidentReportId,
          ],
          exact: true,
        }),
      ]),
  });
}
