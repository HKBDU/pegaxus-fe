import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IncidentReportHeader } from "../components/IncidentReportHeader";
import {
  VehicleIncidentForm,
  type VehicleIncidentFormValue,
} from "../components/vehicle/VehicleIncidentForm";
import type { IncidentPhotoFieldValue } from "../components/IncidentPhotoField";
import { areIncidentPhotosReady } from "../validation";
import { vehicleIncidentRequestSchema } from "../schemas";
import {
  focusFirstIncidentError,
  getIncidentFieldErrors,
  incidentErrorMessage,
  type IncidentFieldErrors,
} from "../validation";
import { useIncidentLocation } from "../hooks/useIncidentLocation";
import { useTransportIncidentGps } from "../hooks/useTransportIncidentGps";
import { useIncidentMutations } from "../hooks/useIncidentMutations";
import { useIncidentReport } from "../hooks/useIncidentReport";
import { useAssignedTransports } from "@/features/horse-health/hooks/useAssignedTransports";
import { useTransportOverview } from "@/features/ongoing-transport/hooks/useTransportOverview";
import {
  incidentPaths,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  VEHICLE_INCIDENT_TYPE,
} from "@/shared/constants/incident";
import type { VehicleIncidentRequest } from "@/shared/types/incident";
import { toUtcIso } from "@/shared/utils/datetime";

type VehicleRouteState = {
  transportId?: string;
  vehicleId?: string;
  locationId?: string;
  locationDescription?: string;
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

export default function VehicleIncidentPage() {
  const navigate = useNavigate();
  const routeState = (useLocation().state as VehicleRouteState | null) ?? {};
  const assignedQuery = useAssignedTransports();
  const activeTransportId =
    routeState.transportId ??
    assignedQuery.data?.items.find(
      (transport) =>
        transport.status === "IN_TRANSIT" || transport.status === "READY",
    )?.transportId ??
    "";
  const transportOverview = useTransportOverview(
    activeTransportId,
    undefined,
    "crew",
    "data",
    false,
  );
  const overviewVehicleId =
    transportOverview.data?.currentSegment?.vehicles[0]?.vehicleId;
  const vehicleId = routeState.vehicleId ?? overviewVehicleId ?? "";
  const driverGps = useTransportIncidentGps(activeTransportId);
  const [photos, setPhotos] = useState(initialPhotos);
  const [fieldErrors, setFieldErrors] = useState<IncidentFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);
  const [photoUploadState, setPhotoUploadState] = useState<"idle" | "uploading" | "ready" | "error">("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(routeState.locationId);
  const location = useIncidentLocation({
    locationId,
    locationDescription: routeState.locationDescription,
    allowDeviceGps: false,
  });
  const incidentCoordinates = driverGps.coordinates;
  const mutations = useIncidentMutations();
  const initialValue = useMemo<VehicleIncidentFormValue>(
    () => ({
      transportId: activeTransportId,
      vehicleId,
      category: INCIDENT_CATEGORY.VEHICLE,
      incidentType: VEHICLE_INCIDENT_TYPE.BREAKDOWN,
      severity: INCIDENT_SEVERITY.MEDIUM,
      title: "",
      description: "",
      immediateAction: "",
      emergencySettlementRequired: false,
      occurredAt: nowLocal(),
      locationId,
      locationDescription: location.locationDescription,
      latitude: incidentCoordinates?.latitude,
      longitude: incidentCoordinates?.longitude,
      vehicleOperable: true,
      vehicleCondition: "",
      damageDescription: "",
      repairRequired: false,
      towingRequired: false,
      replacementVehicleRequired: false,
      estimatedRepairCost: "",
      estimatedRepairHours: "",
      repairNote: "",
    }),
    [
      incidentCoordinates,
      location.locationDescription,
      locationId,
      activeTransportId,
      vehicleId,
    ],
  );

  const form = useIncidentReport<VehicleIncidentFormValue>(initialValue);
  const patchForm = form.patch;

  useEffect(() => {
    const nextValues: Partial<VehicleIncidentFormValue> = {};
    if (activeTransportId && form.values.transportId !== activeTransportId) {
      nextValues.transportId = activeTransportId;
    }
    if (vehicleId && form.values.vehicleId !== vehicleId) {
      nextValues.vehicleId = vehicleId;
    }
    if (Object.keys(nextValues).length > 0) form.patch(nextValues);
  }, [activeTransportId, form, vehicleId]);

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

  const submit = () => {
    if (submitting.current || mutations.vehicle.isPending) return;
    setSubmitError(null);
    setFieldErrors({});
    mutations.vehicle.reset();
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
    const input: VehicleIncidentRequest = {
      transportId: value.transportId,
      vehicleId: value.vehicleId,
      category: value.category,
      incidentType: value.incidentType,
      severity:
        value.category === INCIDENT_CATEGORY.BOTH
          ? INCIDENT_SEVERITY.CRITICAL
          : value.severity,
      title: value.title,
      description: value.description,
      immediateAction: value.immediateAction || undefined,
      vehicleOperable: value.vehicleOperable,
      vehicleCondition: value.vehicleCondition || undefined,
      damageDescription: value.damageDescription || undefined,
      repairRequired: value.repairRequired,
      towingRequired: value.towingRequired,
      replacementVehicleRequired: value.replacementVehicleRequired,
      estimatedRepairCost: value.estimatedRepairCost
        ? Number(value.estimatedRepairCost)
        : undefined,
      repairNote: value.repairNote || undefined,
      estimatedRepairHours: value.estimatedRepairHours
        ? Number(value.estimatedRepairHours)
        : undefined,
      emergencySettlementRequired: value.emergencySettlementRequired,
      occurredAt: toUtcIso(value.occurredAt) ?? value.occurredAt,
      locationId: undefined,
      locationDescription: value.locationDescription || undefined,
      latitude: submitCoordinates?.latitude,
      longitude: submitCoordinates?.longitude,
      photoFiles: photos.uploadedPublicIds.map((publicId) => ({ publicId })),
    };
    const parsed = vehicleIncidentRequestSchema.safeParse(input);
    if (!parsed.success) {
      const errors = getIncidentFieldErrors(parsed.error);
      setFieldErrors(errors);
      setSubmitError(incidentErrorMessage(parsed.error, errors));
      focusFirstIncidentError();
      return;
    }
    submitting.current = true;
    mutations.vehicle.mutate(parsed.data, {
      onSuccess: (result) =>
        navigate(incidentPaths.detail("CREW", result.incidentReportId)),
      onError: focusFirstIncidentError,
      onSettled: () => {
        submitting.current = false;
      },
    });
  };

  const errors = {
    ...fieldErrors,
    ...getIncidentFieldErrors(mutations.vehicle.error),
  };
  const error =
    submitError ?? incidentErrorMessage(mutations.vehicle.error, errors);
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
      <IncidentReportHeader
        longitude={incidentCoordinates?.longitude ?? "Unavailable"}
        latitude={incidentCoordinates?.latitude ?? "Unavailable"}
        locationDescription={driverGps.coordinates ? "Driver shared GPS" : location.locationDescription || "Resolving location…"}
      />
      <VehicleIncidentForm
        value={form.values}
        photos={photos}
        onChange={form.replace}
        onPhotosChange={setPhotos}
        onSubmit={submit}
        submitting={mutations.vehicle.isPending}
        disabled={mutations.vehicle.isPending}
        error={error ?? photoError}
        errors={errors}
        locationStatus={driverGps.coordinates ? "ready" : "unavailable"}
        locationError={driverGps.coordinates ? null : "Waiting for a fresh GPS position shared by the Driver."}
        gpsCoordinates={driverGps.coordinates}
        onPhotoUploadStateChange={setPhotoUploadState}
        onPhotoError={setPhotoError}
      />
    </main>
  );
}
