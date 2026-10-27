import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { INCIDENT_ACTION, INCIDENT_SEVERITY, VEHICLE_INCIDENT_TYPE } from "@/shared/constants/incident";
import type { IncidentAction } from "@/shared/types/incident";
import type {
  RouteSegment,
  Vehicle,
  VehicleBrief,
} from "@/features/route-plan/types";
import { ChangeVehiclesDialog } from "@/features/route-plan/components/ChangeVehiclesDialog";
import { RaiseSeverityButton } from "@/features/incident-report/components/RaiseSeverityButton";
import { VehicleDetailSection } from "@/features/incident-report/components/VehicleDetailSection";
import { HorseForm } from "@/features/horse/pages/AddHorsePage";
import {
  VehicleIncidentFields,
  type VehicleIncidentFieldsValue,
} from "@/features/incident-report/components/vehicle/VehicleIncidentFields";

const now = "2026-10-27T10:30:00Z";

function mockVehicle(id: string, code: string, status: Vehicle["status"]): Vehicle {
  return {
    vehicleId: id,
    vehicleCode: code,
    vehicleName: `${code} Horse Transporter`,
    licensePlate: `51A-${id.slice(-3)}`,
    transportMode: "ROAD",
    capacityHorses: 8,
    country: "Vietnam",
    vehicleType: "HORSE_TRANSPORTER",
    manufacturer: "Pegaxus Fleet",
    model: "SafeRide 8",
    status,
    registrationNumber: `REG-${code}`,
    registrationExpiryDate: "2027-12-31",
    registrationStatus: "VALID",
    insuranceNumber: `INS-${code}`,
    insuranceExpiryDate: "2027-12-31",
    insuranceStatus: "VALID",
    specialEquipment: "Ventilation, ramp, partitions",
    warnings: [],
    isAvailable: status === "AVAILABLE",
    createdAt: now,
    updatedAt: now,
  };
}

const VEHICLES = {
  current: mockVehicle("vehicle-current", "VH-CURRENT", "ASSIGNED"),
  availableA: mockVehicle("vehicle-a", "VH-ALPHA", "AVAILABLE"),
  availableB: mockVehicle("vehicle-b", "VH-BRAVO", "AVAILABLE"),
  availableC: mockVehicle("vehicle-c", "VH-CHARLIE", "AVAILABLE"),
};

function brief(vehicle: Vehicle): VehicleBrief {
  const {
    vehicleId,
    vehicleCode,
    vehicleName,
    licensePlate,
    transportMode,
    capacityHorses,
    country,
  } = vehicle;
  return {
    vehicleId,
    vehicleCode,
    vehicleName,
    licensePlate,
    transportMode,
    capacityHorses,
    country,
  };
}

function mockSegment(id: string, sequenceNo: number, from: string, to: string, vehicle: Vehicle): RouteSegment {
  return {
    routePlanRouteId: id,
    sequenceNo,
    routeType: "PRIMARY",
    route: {
      routeId: `route-${id}`,
      routeCode: `R-${sequenceNo}`,
      routeName: `${from} to ${to}`,
      transportMode: "ROAD",
      distanceKm: 280,
      estimatedDurationMinutes: 360,
    },
    fromLocation: {
      locationId: `from-${id}`,
      locationName: from,
      locationType: "STABLE",
      city: from,
      country: "Vietnam",
      latitude: 10.8,
      longitude: 106.7,
    },
    toLocation: {
      locationId: `to-${id}`,
      locationName: to,
      locationType: "REST_STOP",
      city: to,
      country: "Vietnam",
      latitude: 11.1,
      longitude: 107.1,
    },
    plannedDepartureAt: now,
    plannedArrivalAt: "2026-10-27T16:30:00Z",
    actualDepartureAt: null,
    actualArrivalAt: null,
    status: "PENDING",
    dwellAfterMinutes: 30,
    isOutsourced: false,
    vehicles: [brief(vehicle)],
    outsourcing: null,
    driver: null,
    escort: null,
    note: "Mock segment for UI review",
  };
}

const SEGMENTS = [
  mockSegment("segment-1", 1, "Ho Chi Minh Stable", "Dau Giay Rest Stop", VEHICLES.current),
  mockSegment("segment-2", 2, "Dau Giay Rest Stop", "Da Lat Stable", VEHICLES.current),
];

const routePlan = {
  routePlanId: "mock-route-plan",
  transportPlanId: "mock-transport-plan",
  updatedAt: now,
};

const initialVehicleIncident: VehicleIncidentFieldsValue = {
  category: "VEHICLE",
  incidentType: VEHICLE_INCIDENT_TYPE.ENGINE_FAILURE,
  severity: INCIDENT_SEVERITY.HIGH,
  vehicleOperable: false,
  vehicleCondition: "Engine overheated after departure",
  damageDescription: "Cooling system requires inspection",
  repairRequired: true,
  towingRequired: true,
  replacementVehicleRequired: false,
  estimatedRepairCost: "3500000",
  estimatedRepairHours: "4",
  repairNote: "Stop vehicle and request mechanic",
};

const operatorActions: IncidentAction[] = [INCIDENT_ACTION.RAISE_SEVERITY];
const managerActions: IncidentAction[] = [
  INCIDENT_ACTION.RAISE_SEVERITY,
  INCIDENT_ACTION.LOWER_SEVERITY,
];

export default function Test() {
  const [dialogMode, setDialogMode] = useState<"before-departure" | "mid-trip" | null>(null);
  const [vehicleIncident, setVehicleIncident] = useState(initialVehicleIncident);
  const [saved, setSaved] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-l-4 border-[#f39200] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f39200]">Local component preview</p>
          <h1 className="mt-1 text-2xl font-bold">Route vehicle change + incident workflow</h1>
          <p className="mt-2 text-sm text-slate-600">Mock data only. This page is for visual and interaction review.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[2px] border-slate-300 bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle>Vehicle replacement</CardTitle>
              <p className="text-sm text-slate-600">One vehicle per segment. Unselected segments stay unchanged.</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Button className="w-full rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]" onClick={() => setDialogMode("before-departure")}>
                Open before-departure change
              </Button>
              <Button variant="outline" className="w-full rounded-[2px] border-slate-400" onClick={() => setDialogMode("mid-trip")}>
                Open mid-trip change
              </Button>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge className="rounded-[2px] bg-slate-900">PRIMARY</Badge>
                <Badge variant="outline" className="rounded-[2px]">2 segments</Badge>
                <Badge variant="outline" className="rounded-[2px]">Mock API payload</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2px] border-slate-300 bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle>Severity change</CardTitle>
              <p className="text-sm text-slate-600">Operator can raise. Logistics Manager can raise or lower.</p>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
              <div className="border border-slate-300 p-3">
                <p className="mb-3 text-sm font-bold">Operator · current HIGH</p>
                <RaiseSeverityButton
                  incidentReportId="mock-incident"
                  severity={INCIDENT_SEVERITY.HIGH}
                  lastUpdatedAt={now}
                  availableActions={operatorActions}
                />
              </div>
              <div className="border border-slate-300 p-3">
                <p className="mb-3 text-sm font-bold">LM · current HIGH</p>
                <RaiseSeverityButton
                  incidentReportId="mock-incident"
                  severity={INCIDENT_SEVERITY.HIGH}
                  lastUpdatedAt={now}
                  availableActions={managerActions}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <Card className="rounded-[2px] border-slate-300 bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle>Vehicle incident fields</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <VehicleIncidentFields value={vehicleIncident} onChange={setVehicleIncident} />
              <Button className="mt-4 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]" onClick={() => setSaved(true)}>
                Save mock fields
              </Button>
              {saved && <p className="mt-3 border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Mock fields saved locally.</p>}
            </CardContent>
          </Card>

          <VehicleDetailSection
            incidentReportId="mock-incident"
            detail={{
              vehicleIncidentDetailId: "mock-vehicle-detail",
              vehicle: {
                vehicleId: VEHICLES.current.vehicleId,
                vehicleCode: VEHICLES.current.vehicleCode,
                licensePlate: VEHICLES.current.licensePlate ?? "",
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
              driverSafetyStatus: "SAFE",
              cargoConditionNote: "Horses stable",
              updatedAt: now,
            }}
            availableActions={[INCIDENT_ACTION.SUPPLEMENT_VEHICLE]}
          />
        </section>

        <section className="border-t-4 border-[#f39200] pt-5">
          <Card className="rounded-[2px] border-slate-300 bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle>Add horse form</CardTitle>
              <p className="text-sm text-slate-600">Mock preview for horse details and avatar upload.</p>
            </CardHeader>
            <CardContent className="pt-2">
              <HorseForm
                mode="create"
                onSaved={() => setSaved(true)}
                onCancel={() => setSaved(false)}
              />
              {saved && <p className="border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Horse form submitted.</p>}
            </CardContent>
          </Card>
        </section>
      </div>

      {dialogMode && (
        <ChangeVehiclesDialog
          open
          onOpenChange={(open) => !open && setDialogMode(null)}
          mode={dialogMode}
          routePlan={routePlan}
          segments={SEGMENTS}
          incidentReportId={dialogMode === "mid-trip" ? "mock-incident" : undefined}
          vehiclesBySegment={{
            "segment-1": [VEHICLES.availableA, VEHICLES.availableB],
            "segment-2": [VEHICLES.availableB, VEHICLES.availableC],
          }}
          onChanged={() => setDialogMode(null)}
          onReload={() => setDialogMode(null)}
        />
      )}
    </main>
  );
}
