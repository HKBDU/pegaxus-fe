import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  addHorseDetailsRequestSchema,
  horseHealthIncidentRequestSchema,
  raiseSeverityRequestSchema,
  supplementVehicleRequestSchema,
  vehicleIncidentRequestSchema,
  veterinaryOutcomeRequestSchema,
} from "../schemas";
import {
  addHorseDetails,
  createHorseHealthIncident,
  createVehicleIncident,
  raiseIncidentSeverity,
  supplementVehicle,
  updateVeterinaryOutcome,
  type IncidentApiError,
} from "../services";
import { INCIDENT_REPORT_QUERY_KEYS } from "../constants/incident.constants";
import type {
  AddHorseDetailsRequest,
  HorseHealthIncidentRequest,
  RaiseSeverityRequest,
  SupplementVehicleRequest,
  VehicleIncidentRequest,
  VeterinaryOutcomeRequest,
} from "@/shared/types/incident";

export type IncidentRequestErrorKind =
  "validation" | "conflict" | "network" | "backend" | "unknown";

export function classifyIncidentError(
  error: unknown,
): IncidentRequestErrorKind {
  const incidentError = error as IncidentApiError;
  if (
    incidentError.errorCode === "INCIDENT_MODIFIED" ||
    incidentError.errorCode?.endsWith("_MODIFIED")
  )
    return "conflict";
  if (
    incidentError.errorCode === "VALIDATION_ERROR" ||
    incidentError.errorCode?.startsWith("INVALID_")
  )
    return "validation";
  if (isAxiosError(error) && !error.response) return "network";
  if (incidentError.errorCode === "NETWORK_ERROR") return "network";
  if (incidentError.errorCode) return "backend";
  return "unknown";
}

export function useIncidentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [INCIDENT_REPORT_QUERY_KEYS.detail],
    });

  const vehicle = useMutation({
    mutationFn: (input: VehicleIncidentRequest) =>
      createVehicleIncident(vehicleIncidentRequestSchema.parse(input)),
    onSuccess: invalidate,
    networkMode: "always",
  });
  const horseHealth = useMutation({
    mutationFn: (input: HorseHealthIncidentRequest) =>
      createHorseHealthIncident(horseHealthIncidentRequestSchema.parse(input)),
    onSuccess: invalidate,
    networkMode: "always",
  });
  const horseDetails = useMutation({
    mutationFn: ({
      incidentReportId,
      input,
    }: {
      incidentReportId: string;
      input: AddHorseDetailsRequest;
    }) =>
      addHorseDetails(
        incidentReportId,
        addHorseDetailsRequestSchema.parse(input),
      ),
    onSuccess: invalidate,
    networkMode: "always",
  });
  const vehicleDetails = useMutation({
    mutationFn: ({
      incidentReportId,
      input,
    }: {
      incidentReportId: string;
      input: SupplementVehicleRequest;
    }) =>
      supplementVehicle(
        incidentReportId,
        supplementVehicleRequestSchema.parse(input),
      ),
    onSuccess: invalidate,
    networkMode: "always",
  });
  const veterinaryOutcome = useMutation({
    mutationFn: ({
      incidentReportId,
      horseHealthIncidentDetailId,
      input,
    }: {
      incidentReportId: string;
      horseHealthIncidentDetailId: string;
      input: VeterinaryOutcomeRequest;
    }) =>
      updateVeterinaryOutcome(
        incidentReportId,
        horseHealthIncidentDetailId,
        veterinaryOutcomeRequestSchema.parse(input),
      ),
    onSuccess: invalidate,
    networkMode: "always",
  });
  const raiseSeverity = useMutation({
    mutationFn: ({
      incidentReportId,
      input,
    }: {
      incidentReportId: string;
      input: RaiseSeverityRequest;
    }) =>
      raiseIncidentSeverity(
        incidentReportId,
        raiseSeverityRequestSchema.parse(input),
      ),
    onSuccess: invalidate,
    retry: false,
    networkMode: "always",
  });

  return {
    vehicle,
    horseHealth,
    horseDetails,
    vehicleDetails,
    veterinaryOutcome,
    raiseSeverity,
    classifyError: classifyIncidentError,
  };
}
