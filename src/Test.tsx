import { useMemo, useState } from "react";

import type { HorseHealthOverviewItem } from "@/features/horse-health/types";
import {
  INCIDENT_SEVERITY,
  INCIDENT_ACTION,
  HORSE_INCIDENT_TYPE,
  VEHICLE_INCIDENT_TYPE,
} from "@/shared/constants/incident";
import type {
  EmergencyContact,
  HorseIncidentDetail,
  VehicleIncidentDetail,
} from "@/shared/types/incident";

import { IncidentReportHeader } from "./features/incident-report/components/IncidentReportHeader";
import type { IncidentPhotoFieldValue } from "./features/incident-report/components/IncidentPhotoField";
import {
  HorseHealthIncidentForm,
  type HorseHealthIncidentFormValue,
} from "./features/incident-report/components/horse-health/HorseHealthIncidentForm";
import type { HorseHealthFieldsValue } from "./features/incident-report/components/horse-health/HorseHealthFields";
import { HorseIncidentSelectionStep } from "./features/incident-report/components/horse-health/HorseIncidentSelectionStep";
import { VehicleDetailSection } from "./features/incident-report/components/VehicleDetailSection";
import { HorseDetailsSection } from "./features/incident-report/components/HorseDetailsSection";
import { RaiseSeverityButton } from "./features/incident-report/components/RaiseSeverityButton";
import { EmergencyContactsCard } from "./features/incident-report/components/EmergencyContactsCard";

const MOCK_HORSES: HorseHealthOverviewItem[] = [
  {
    horse: {
      horseId: "mock-horse-1",
      horseName: "Horse Name 1",
      passportNumber: "IRE-2026-X981",
      microchipNumber: "985-1410-9234-8110",
    },
    latestHealthStatus: "NORMAL",
    latestLog: null,
    logCount: 0,
  },
  {
    horse: {
      horseId: "mock-horse-2",
      horseName: "Horse Name 2",
      passportNumber: "GB-2025-V442",
      microchipNumber: "985-1410-9234-8114",
    },
    latestHealthStatus: "OBSERVATION_REQUIRED",
    latestLog: null,
    logCount: 1,
  },
  {
    horse: {
      horseId: "mock-horse-3",
      horseName: "Horse Name 3",
      passportNumber: "FR-2026-M118",
      microchipNumber: "985-1410-9234-8201",
    },
    latestHealthStatus: "NORMAL",
    latestLog: null,
    logCount: 0,
  },
];

const emptyHorseDetails = (): HorseHealthFieldsValue => ({
  incidentType: "INJURY",
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
});

const emptyPhotos: IncidentPhotoFieldValue = {
  files: [],
  capturedAt: [],
  coordinates: [],
  captions: [],
  uploadedPublicIds: [],
};

const MOCK_VEHICLE_DETAIL: VehicleIncidentDetail = {
  vehicleIncidentDetailId: "mock-vehicle-detail",
  vehicle: {
    vehicleId: "mock-vehicle",
    vehicleCode: "TRUCK-001",
    licensePlate: "51A-12345",
    status: "IN_SERVICE",
  },
  incidentType: VEHICLE_INCIDENT_TYPE.ENGINE_FAILURE,
  vehicleCondition: "Engine overheated",
  damageDescription: "Cooling system requires inspection",
  repairNote: "Stop vehicle and request mechanic",
  vehicleOperable: false,
  repairRequired: true,
  towingRequired: true,
  replacementVehicleRequired: false,
  estimatedRepairCost: 3500000,
  estimatedRepairHours: 4,
  driverSafetyStatus: "Crew safe",
  cargoConditionNote: "Horses stable",
  updatedAt: "2026-10-22T10:30:00Z",
};

const MOCK_HORSE_DETAILS: HorseIncidentDetail[] = MOCK_HORSES.slice(0, 2).map(
  (item, index) => ({
    horseHealthIncidentDetailId: `mock-horse-detail-${index + 1}`,
    horse: {
      horseId: item.horse.horseId,
      horseName: item.horse.horseName,
      microchipNumber: item.horse.microchipNumber ?? undefined,
    },
    incidentType:
      index === 0 ? HORSE_INCIDENT_TYPE.INJURY : HORSE_INCIDENT_TYPE.FEVER,
    conditionDescription:
      index === 0
        ? "Small leg injury observed"
        : "Temperature above normal range",
    symptoms: index === 0 ? "Limping" : "Low appetite",
    bodyTemperatureCelsius: index === 0 ? 38.4 : 39.5,
    heartRateBpm: 48,
    respiratoryRateBpm: 18,
    firstAidProvided: "Moved to rest area",
    veterinarianRequired: true,
    veterinarianContactedAt: null,
    isolationRequired: index === 1,
    veterinarianInstruction: null,
    medicationGiven: null,
    outcomeNote: null,
    horseTransportable: null,
    vitalWarnings:
      index === 1 ? ["Body temperature is above the normal range"] : [],
    updatedAt: "2026-10-22T10:30:00Z",
  }),
);

const MOCK_CONTACTS: EmergencyContact[] = [
  {
    employeeId: "mock-contact-1",
    employeeCode: "OPS-001",
    fullName: "Operations Hotline",
    role: "OPERATOR",
    phone: "+84123456789",
  },
  {
    employeeId: "mock-contact-2",
    employeeCode: "VET-001",
    fullName: "Dr. Sophie Laurent",
    role: "VETERINARIAN",
    phone: "+84987654321",
  },
];

export default function Test() {
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);
  const [step, setStep] = useState<"selection" | "form">("selection");
  const [photos, setPhotos] = useState(emptyPhotos);
  const [submitted, setSubmitted] = useState(false);
  const selectedHorses = useMemo(
    () =>
      MOCK_HORSES.filter((item) =>
        selectedHorseIds.includes(item.horse.horseId),
      ),
    [selectedHorseIds],
  );
  const [value, setValue] = useState<HorseHealthIncidentFormValue>(() => ({
    transportId: "MOCK-TRANSPORT-001",
    category: "HORSE_HEALTH",
    severity: INCIDENT_SEVERITY.HIGH,
    title: "",
    description: "",
    immediateAction: "",
    emergencySettlementRequired: false,
    occurredAt: "2026-10-22T10:30",
    locationId: "mock-location-1",
    locationDescription: "Mock rest stop",
    latitude: 50.6292,
    longitude: 3.0573,
    horses: {},
  }));

  const toggleHorse = (horseId: string) => {
    setSelectedHorseIds((current) =>
      current.includes(horseId)
        ? current.filter((id) => id !== horseId)
        : [...current, horseId],
    );
  };

  const goToForm = () => {
    setValue((current) => ({
      ...current,
      horses: Object.fromEntries(
        selectedHorseIds.map((horseId) => [
          horseId,
          current.horses[horseId] ?? emptyHorseDetails(),
        ]),
      ),
    }));
    setStep("form");
  };

  if (step === "selection") {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#f39200]">
            Mock UI preview
          </p>
          <HorseIncidentSelectionStep
            horses={MOCK_HORSES}
            selectedHorseIds={selectedHorseIds}
            onToggle={toggleHorse}
            onNext={goToForm}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-32 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <IncidentReportHeader
          transportId={value.transportId}
          latitude={value.latitude ?? "Unavailable"}
          longitude={value.longitude ?? "Unavailable"}
          locationDescription={value.locationDescription}
          backHref="#"
        />
        <button
          type="button"
          onClick={() => setStep("selection")}
          className="text-sm font-bold underline"
        >
          ← Change selected horses
        </button>
        <HorseHealthIncidentForm
          value={value}
          horses={selectedHorses}
          photos={photos}
          onChange={setValue}
          onPhotosChange={setPhotos}
          onSubmit={() => setSubmitted(true)}
          locationStatus="ready"
          disabled={submitted}
        />
        <section className="space-y-4 border-t-4 border-[#f39200] pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Mock Incident Detail
            </p>
            <h2 className="font-heading text-xl font-bold text-[#181818]">
              Step 8–10 preview
            </h2>
          </div>
          <VehicleDetailSection
            incidentReportId="mock-incident-001"
            detail={MOCK_VEHICLE_DETAIL}
            availableActions={[
              INCIDENT_ACTION.SUPPLEMENT_VEHICLE,
              INCIDENT_ACTION.RAISE_SEVERITY,
            ]}
          />
          <HorseDetailsSection
            incidentReportId="mock-incident-001"
            details={MOCK_HORSE_DETAILS}
            availableActions={[
              INCIDENT_ACTION.ADD_HORSE_DETAIL,
              INCIDENT_ACTION.FOLLOW_UP_HORSE,
            ]}
          />
          <div className="border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-[#181818]">
              Severity action
            </p>
            <RaiseSeverityButton
              incidentReportId="mock-incident-001"
              severity={INCIDENT_SEVERITY.MEDIUM}
              lastUpdatedAt="2026-10-22T10:30:00Z"
              availableActions={[INCIDENT_ACTION.RAISE_SEVERITY]}
            />
          </div>
          <EmergencyContactsCard contacts={MOCK_CONTACTS} />
        </section>
        {submitted && (
          <pre className="overflow-auto bg-slate-900 p-4 text-xs text-white">
            {JSON.stringify({ value, photos }, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
