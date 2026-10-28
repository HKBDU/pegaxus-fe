import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IncidentReportHeader } from "../components/IncidentReportHeader";
import {
  VehicleIncidentForm,
  type VehicleIncidentFormValue,
} from "../components/vehicle/VehicleIncidentForm";
import type { IncidentPhotoFieldValue } from "../components/IncidentPhotoField";
import { useIncidentLocation } from "../hooks/useIncidentLocation";
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
  const [photos, setPhotos] = useState(initialPhotos);
  const [locationId, setLocationId] = useState(routeState.locationId);
  const location = useIncidentLocation({
    locationId,
    locationDescription: routeState.locationDescription,
  });
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
      latitude: location.coordinates?.latitude,
      longitude: location.coordinates?.longitude,
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
      location.coordinates,
      location.locationDescription,
      locationId,
      activeTransportId,
      vehicleId,
    ],
  );

  const form = useIncidentReport<VehicleIncidentFormValue>(initialValue);

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

  const submit = () => {
    const value = form.values;
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
      locationId: value.locationId,
      locationDescription: value.locationDescription || undefined,
      latitude: value.latitude,
      longitude: value.longitude,
      photoFiles: photos.uploadedPublicIds.map((publicId) => ({ publicId })),
    };
    mutations.vehicle.mutate(input, {
      onSuccess: (result) =>
        navigate(incidentPaths.detail("CREW", result.incidentReportId)),
    });
  };

  const error =
    mutations.vehicle.error instanceof Error
      ? mutations.vehicle.error.message
      : null;
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
      <VehicleIncidentForm
        value={form.values}
        photos={photos}
        onChange={form.replace}
        onPhotosChange={setPhotos}
        onSubmit={submit}
        submitting={mutations.vehicle.isPending}
        disabled={mutations.vehicle.isPending}
        error={error}
        locationStatus={location.status}
        locationError={location.error}
      />
    </main>
  );
}
