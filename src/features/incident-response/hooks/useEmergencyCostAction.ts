import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  emergencyCostService,
  getEmergencyCostError,
  type EmergencyCostActionSubmission,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useEmergencyCostAction() {
  const { scope, key } = useEmergencyCostScope();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [scope]);
  return useMutation({
    mutationKey: [...key, "action"],
    retry: false,
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
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: (error, submission) => {
      const presentation = getEmergencyCostError(error, submission.action);
      if (
        presentation.conflict ||
        presentation.outcomeUnknown ||
        presentation.submissionBlocked
      )
        return client.invalidateQueries({ queryKey: key });
    },
  });
}
