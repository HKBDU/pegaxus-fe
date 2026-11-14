import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useHorseHealthOverview } from "@/features/horse-health/hooks/useHorseHealth";
import { useAssignedTransports } from "@/features/horse-health/hooks/useAssignedTransports";
import {
  HORSE_INCIDENT_TYPE,
  INCIDENT_SEVERITY,
  incidentPaths,
} from "@/shared/constants/incident";
import type { HorseHealthIncidentRequest } from "@/shared/types/incident";
import { toUtcIso } from "@/shared/utils/datetime";

import { PageHeader } from "@/shared/components/PageHeader";
import { IncidentReportHeader } from "../components/IncidentReportHeader";
import type { IncidentPhotoFieldValue } from "../components/IncidentPhotoField";
import { areIncidentPhotosReady } from "../validation";
import { horseHealthIncidentRequestSchema } from "../schemas";
import {
  focusFirstIncidentError,
  getIncidentFieldErrors,
  incidentErrorMessage,
  type IncidentFieldErrors,
} from "../validation";
import {
  HorseHealthIncidentForm,
  type HorseHealthIncidentFormValue,
} from "../components/horse-health/HorseHealthIncidentForm";
import type { HorseHealthFieldsValue } from "../components/horse-health/HorseHealthFields";
import { HorseIncidentSelectionStep } from "../components/horse-health/HorseIncidentSelectionStep";
import { useIncidentLocation } from "../hooks/useIncidentLocation";
import { useTransportIncidentGps } from "../hooks/useTransportIncidentGps";
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
  const driverGps = useTransportIncidentGps(transportId ?? "");
  const [step, setStep] = useState<"selection" | "form">("selection");
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>(
    routeState.horseIds ?? [],
  );
  const [photos, setPhotos] = useState(initialPhotos);
  const [fieldErrors, setFieldErrors] = useState<IncidentFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);
  const [photoUploadState, setPhotoUploadState] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(routeState.locationId);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(
    null,
  );
  const location = useIncidentLocation({
    locationId,
    locationDescription: routeState.locationDescription,
    allowDeviceGps: false,
  });
  const incidentCoordinates = driverGps.coordinates;
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
      latitude: incidentCoordinates?.latitude,
      longitude: incidentCoordinates?.longitude,
      horses: createHorseDetailsMap(selectedHorseIds),
    }),
    [
      incidentCoordinates,
      location.locationDescription,
      locationId,
      selectedHorseIds,
      transportId,
    ],
  );
  const form = useIncidentReport<HorseHealthIncidentFormValue>(initialValue);
  const patchForm = form.patch;

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

  useEffect(() => {
    const coordinates = driverGps.coordinates;
    if (!coordinates) return;
    if (
      form.values.latitude === coordinates.latitude &&
      form.values.longitude === coordinates.longitude &&
      form.values.locationDescription === "Driver shared GPS" &&
      !form.values.locationId
    ) return;
    patchForm({
      locationId: undefined,
      locationDescription: "Driver shared GPS",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  }, [driverGps.coordinates, form.values, patchForm]);

  const toggleHorse = (horseId: string) => {
    setSelectedHorseIds((current) =>
      current.includes(horseId)
        ? current.filter((id) => id !== horseId)
        : [...current, horseId],
    );
  };

  const submit = () => {
    if (
      submitting.current ||
      mutations.horseHealth.isPending ||
      createdIncidentId
    )
      return;
    setSubmitError(null);
    setFieldErrors({});
    mutations.horseHealth.reset();
    if (!driverGps.coordinates) {
      setSubmitError("Waiting for a fresh GPS position shared by the Driver.");
      return;
    }
    if (!areIncidentPhotosReady({ ...photos, uploadState: photoUploadState })) {
      setSubmitError(
        "Wait for every selected photo to upload, or retry/remove failed photos before submitting.",
      );
      return;
    }
    const value = form.values;
    const submitCoordinates = driverGps.coordinates;
    const input: HorseHealthIncidentRequest = {
      transportId: value.transportId,
      severity: value.severity,
      title: value.title,
      immediateAction: value.immediateAction || undefined,
      emergencySettlementRequired: value.emergencySettlementRequired,
      occurredAt: toUtcIso(value.occurredAt) ?? value.occurredAt,
      locationId: undefined,
      locationDescription: value.locationDescription || undefined,
      latitude: submitCoordinates?.latitude,
      longitude: submitCoordinates?.longitude,
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
            ? toUtcIso(details.veterinarianContactedAt)
            : undefined,
          veterinarianInstruction: details.veterinarianInstruction || undefined,
          medicationGiven: details.medicationGiven || undefined,
          horseTransportable: details.horseTransportable,
        };
      }),
      photoFiles: photos.uploadedPublicIds.map((publicId) => ({ publicId })),
    };
    const parsed = horseHealthIncidentRequestSchema.safeParse(input);
    if (!parsed.success) {
      const errors = getIncidentFieldErrors(parsed.error, selectedHorseIds);
      setFieldErrors(errors);
      setSubmitError(incidentErrorMessage(parsed.error, errors));
      focusFirstIncidentError();
      return;
    }
    submitting.current = true;
    mutations.horseHealth.mutate(parsed.data, {
      onSuccess: (result) => {
        setWarnings(result.effects?.vitalWarnings ?? []);
        setCreatedIncidentId(result.incidentReportId);
      },
      onError: focusFirstIncidentError,
      onSettled: () => {
        submitting.current = false;
      },
    });
  };

  const errors = {
    ...fieldErrors,
    ...getIncidentFieldErrors(mutations.horseHealth.error, selectedHorseIds),
  };
  const error =
    submitError ?? incidentErrorMessage(mutations.horseHealth.error, errors);

  if (step === "selection") {
    return (
      <main className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6 lg:p-8">
        {!transportId ? (
          <div className="space-y-4">
            <PageHeader
              title="Report horse incident"
              backHref="/crew"
              backLabel="Back to Ongoing Transport"
            />
            <p className="border border-red-600 bg-red-50 p-4 text-sm text-red-700">
              No active transport was provided. Open this report from the
              transport home screen.
            </p>
          </div>
        ) : overview.isPending ? (
          <div className="space-y-4">
            <PageHeader
              title="Report horse incident"
              backHref="/crew"
              backLabel="Back to Ongoing Transport"
            />
            <p className="border border-slate-300 bg-white p-4 text-sm text-slate-600">
              Loading horses in this transport…
            </p>
          </div>
        ) : overview.error ? (
          <div className="space-y-4">
            <PageHeader
              title="Report horse incident"
              backHref="/crew"
              backLabel="Back to Ongoing Transport"
            />
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
          </div>
        ) : (
          <HorseIncidentSelectionStep
            horses={overview.data?.horses ?? []}
            selectedHorseIds={selectedHorseIds}
            onToggle={toggleHorse}
            onNext={() => {
              form.replace({
                ...form.values,
                transportId: transportId ?? "",
                horses: {
                  ...form.values.horses,
                  ...Object.fromEntries(
                    selectedHorseIds.map((id) => [
                      id,
                      form.values.horses[id] ?? createHorseDetails(),
                    ]),
                  ),
                },
              });
              setStep("form");
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
      <IncidentReportHeader
        longitude={incidentCoordinates?.longitude ?? "Unavailable"}
        latitude={incidentCoordinates?.latitude ?? "Unavailable"}
        locationDescription={driverGps.coordinates ? "Driver shared GPS" : location.locationDescription || "Resolving location…"}
      />
      <button
        type="button"
        disabled={mutations.horseHealth.isPending || Boolean(createdIncidentId)}
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
        error={error ?? photoError}
        errors={errors}
        locationStatus={driverGps.coordinates ? "ready" : "unavailable"}
        locationError={driverGps.coordinates ? null : "Waiting for a fresh GPS position shared by the Driver."}
        gpsCoordinates={driverGps.coordinates}
        onPhotoUploadStateChange={setPhotoUploadState}
        onPhotoError={setPhotoError}
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
