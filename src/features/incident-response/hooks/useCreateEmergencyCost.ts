import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  emergencyCostService,
  type CreateEmergencyCostSubmission,
} from "../services";
import { useEmergencyCostScope } from "./useEmergencyCostScope";

export function useCreateEmergencyCost() {
  const { scope, key } = useEmergencyCostScope();
  const client = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [scope]);
  return useMutation({
    mutationKey: [...key, "create"],
    retry: false,
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
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
