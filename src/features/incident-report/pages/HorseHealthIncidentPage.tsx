import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useHorseHealthOverview } from "@/features/horse-health/hooks/useHorseHealth";
import { useAssignedTransports } from "@/features/horse-health/hooks/useAssignedTransports";
import {
  HORSE_INCIDENT_TYPE,
  INCIDENT_SEVERITY,
  incidentPaths,
} from "@/shared/constants/incident";
import type { HorseHealthIncidentRequest } from "@/shared/types/incident";

import { IncidentReportHeader } from "../components/IncidentReportHeader";
import type { IncidentPhotoFieldValue } from "../components/IncidentPhotoField";
import {
  HorseHealthIncidentForm,
  type HorseHealthIncidentFormValue,
} from "../components/horse-health/HorseHealthIncidentForm";
import type { HorseHealthFieldsValue } from "../components/horse-health/HorseHealthFields";
import { HorseIncidentSelectionStep } from "../components/horse-health/HorseIncidentSelectionStep";
import { useIncidentLocation } from "../hooks/useIncidentLocation";
import { useIncidentMutations } from "../hooks/useIncidentMutations";
import { useIncidentReport } from "../hooks/useIncidentReport";

type HorseRouteState = {
  transportId?: string;
  locationId?: string;
  locationDescription?: string;
  horseIds?: string[];
};

const nowLocal = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const initialPhotos: IncidentPhotoFieldValue = {
  files: [],
  capturedAt: [],
  coordinates: [],
  captions: [],
  uploadedPublicIds: [],
};

function createHorseDetails(): HorseHealthFieldsValue {
  return {
    incidentType: HORSE_INCIDENT_TYPE.INJURY,
    conditionDescription: "",
    symptoms: "",
    bodyTemperatureCelsius: "",
    heartRateBpm: "",
    respiratoryRateBpm: "",
    firstAidProvided: "",
    veterinarianRequired: false,
    isolationRequired: false,
    veterinarianContactedAt: "",
    veterinarianInstruction: "",
    medicationGiven: "",
    horseTransportable: null,
  };
}

function createHorseDetailsMap(horseIds: string[]) {
  return Object.fromEntries(
    horseIds.map((horseId) => [horseId, createHorseDetails()]),
  );
}

export default function HorseHealthIncidentPage() {
  const navigate = useNavigate();
  const routeState = (useLocation().state as HorseRouteState | null) ?? {};
  const assignedQuery = useAssignedTransports();
  const transportId =
    routeState.transportId ??
    assignedQuery.data?.items.find(
      (transport) =>
        transport.status === "IN_TRANSIT" || transport.status === "READY",
    )?.transportId ??
    null;
  const overview = useHorseHealthOverview(transportId);
  const [step, setStep] = useState<"selection" | "form">("selection");
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>(
    routeState.horseIds ?? [],
  );
  const [photos, setPhotos] = useState(initialPhotos);
  const [locationId, setLocationId] = useState(routeState.locationId);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(
    null,
  );
  const location = useIncidentLocation({
    locationId,
    locationDescription: routeState.locationDescription,
  });
  const mutations = useIncidentMutations();
  const selectedHorses = useMemo(
    () =>
      (overview.data?.horses ?? []).filter((item) =>
        selectedHorseIds.includes(item.horse.horseId),
      ),
    [overview.data?.horses, selectedHorseIds],
  );
  const initialValue = useMemo<HorseHealthIncidentFormValue>(
    () => ({
      transportId: transportId ?? "",
      category: "HORSE_HEALTH",
      severity: INCIDENT_SEVERITY.HIGH,
      title: "",
      description: "",
      immediateAction: "",
      emergencySettlementRequired: false,
      occurredAt: nowLocal(),
      locationId,
      locationDescription: location.locationDescription,
      latitude: location.coordinates?.latitude,
      longitude: location.coordinates?.longitude,
      horses: createHorseDetailsMap(selectedHorseIds),
    }),
    [
      location.coordinates,
      location.locationDescription,
      locationId,
      selectedHorseIds,
      transportId,
    ],
  );
  const form = useIncidentReport<HorseHealthIncidentFormValue>(initialValue);

  useEffect(() => {
    if (!location.locationId || location.locationId === locationId) return;
    setLocationId(location.locationId);
    form.patch({
      locationId: location.locationId,
      locationDescription: location.locationDescription,
      latitude: location.coordinates?.latitude,
      longitude: location.coordinates?.longitude,
    });
  }, [
    form,
    location.coordinates,
    location.locationDescription,
    location.locationId,
    locationId,
  ]);

  const toggleHorse = (horseId: string) => {
    setSelectedHorseIds((current) =>
      current.includes(horseId)
        ? current.filter((id) => id !== horseId)
        : [...current, horseId],
    );
  };

  const submit = () => {
    const value = form.values;
    const input: HorseHealthIncidentRequest = {
      transportId: value.transportId,
      severity: value.severity,
      title: value.title,
      immediateAction: value.immediateAction || undefined,
      emergencySettlementRequired: value.emergencySettlementRequired,
      occurredAt: new Date(value.occurredAt).toISOString(),
      locationId: value.locationId,
      locationDescription: value.locationDescription || undefined,
      latitude: value.latitude,
      longitude: value.longitude,
      horses: selectedHorseIds.map((horseId) => {
        const details = value.horses[horseId];
        return {
          horseId,
          incidentType: details.incidentType,
          conditionDescription: details.conditionDescription,
          symptoms: details.symptoms || undefined,
          bodyTemperatureCelsius: details.bodyTemperatureCelsius
            ? Number(details.bodyTemperatureCelsius)
            : undefined,
          heartRateBpm: details.heartRateBpm
            ? Number(details.heartRateBpm)
            : undefined,
          respiratoryRateBpm: details.respiratoryRateBpm
            ? Number(details.respiratoryRateBpm)
            : undefined,
          firstAidProvided: details.firstAidProvided || undefined,
          veterinarianRequired: details.veterinarianRequired,
          isolationRequired: details.isolationRequired,
          veterinarianContactedAt: details.veterinarianContactedAt
            ? new Date(details.veterinarianContactedAt).toISOString()
            : undefined,
          veterinarianInstruction: details.veterinarianInstruction || undefined,
          medicationGiven: details.medicationGiven || undefined,
          horseTransportable: details.horseTransportable,
        };
      }),
      photoFiles: photos.uploadedPublicIds.map((publicId) => ({ publicId })),
    };
    mutations.horseHealth.mutate(input, {
      onSuccess: (result) => {
        setWarnings(result.effects?.vitalWarnings ?? []);
        setCreatedIncidentId(result.incidentReportId);
      },
    });
  };

  const error =
    mutations.horseHealth.error instanceof Error
      ? mutations.horseHealth.error.message
      : null;

  if (step === "selection") {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        {!transportId ? (
          <p className="border border-red-600 bg-red-50 p-4 text-sm text-red-700">
            No active transport was provided. Open this report from the
            transport home screen.
          </p>
        ) : overview.isPending ? (
          <p className="border border-slate-300 bg-white p-4 text-sm text-slate-600">
            Loading horses in this transport…
          </p>
        ) : overview.error ? (
          <div className="border border-red-600 bg-red-50 p-4 text-sm text-red-700">
            <p>Unable to load the horses in this transport.</p>
            <button
              type="button"
              onClick={() => void overview.refetch()}
              className="mt-3 min-h-12 border border-red-600 px-4 font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <HorseIncidentSelectionStep
            horses={overview.data?.horses ?? []}
            selectedHorseIds={selectedHorseIds}
            onToggle={toggleHorse}
            onNext={() => {
              form.replace(initialValue);
              setStep("form");
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 pb-28 sm:p-6">
      <IncidentReportHeader
        transportId={form.values.transportId || "Current transport"}
        longitude={location.coordinates?.longitude ?? "Unavailable"}
        latitude={location.coordinates?.latitude ?? "Unavailable"}
        locationDescription={
          location.locationDescription || "Resolving location…"
        }
      />
      <button
        type="button"
        disabled={Boolean(createdIncidentId)}
        onClick={() => setStep("selection")}
        className="text-left text-sm font-bold text-[#181818] underline disabled:no-underline disabled:opacity-50"
      >
        ← Change selected horses ({selectedHorseIds.length})
      </button>
      <HorseHealthIncidentForm
        value={form.values}
        horses={selectedHorses}
        photos={photos}
        onChange={form.replace}
        onPhotosChange={setPhotos}
        onSubmit={submit}
        warnings={warnings}
        submitting={mutations.horseHealth.isPending}
        disabled={mutations.horseHealth.isPending || Boolean(createdIncidentId)}
        error={error}
        locationStatus={location.status}
        locationError={location.error}
      />
      {createdIncidentId && (
        <button
          type="button"
          onClick={() =>
            navigate(incidentPaths.detail("CREW", createdIncidentId))
          }
          className="min-h-12 w-full rounded-[2px] bg-[#181818] px-4 py-3 font-bold text-white"
        >
          Open incident detail
        </button>
      )}
    </main>
  );
}
