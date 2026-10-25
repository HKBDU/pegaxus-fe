import type { Vehicle, VehicleAssignment } from "@/features/fleet/types"

/** Mock rows keep only stored columns; registrationStatus / insuranceStatus / warnings are derived like the BE does. */
export type MockVehicleRow = Omit<Vehicle, "registrationStatus" | "insuranceStatus" | "warnings">

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

const EQUIP_FULL =
  "[AIR SUSPENSION DAMPING; BIOMETRIC THERMAL SENSORS; ANTI-VIBRATION BULKHEADS; 24/7 STALL MONITORING CAMERA; MULTI-ZONE CLIMATE CONTROL]\nECAS active air dampening suspension, in-stall biometric heart rate and thermal sensors, high-grade anti-vibration composite partitions, 360-degree infrared night vision camera connected directly to satellite telemetry."

const row = (
  n: number,
  vehicleCode: string,
  vehicleName: string,
  transportMode: MockVehicleRow["transportMode"],
  licensePlate: string,
  vehicleType: string,
  manufacturer: string,
  model: string,
  capacityHorses: number,
  status: MockVehicleRow["status"],
  registrationExpiryDate: string,
  insuranceExpiryDate: string,
  specialEquipment: string,
  updatedAt: string,
): MockVehicleRow => ({
  vehicleId: id(n),
  vehicleCode,
  vehicleName,
  transportMode,
  licensePlate,
  vehicleType,
  manufacturer,
  model,
  capacityHorses,
  status,
  registrationNumber: `CERT-IE-2026-${String(n).padStart(2, "0")}`,
  registrationExpiryDate,
  insuranceNumber: `POL-EQ-${88100 + n}`,
  insuranceExpiryDate,
  specialEquipment,
  createdAt: "2026-08-01T03:00:00Z",
  updatedAt,
  country: "FR",
})

export const MOCK_VEHICLES: MockVehicleRow[] = [
  row(1, "FL-RD-01", "Pegaxus Hauler Alpha", "ROAD", "29C-882.14", "Specialized Transporter", "Volvo", "FH16", 4, "AVAILABLE", "2026-11-30", "2026-12-31", EQUIP_FULL, "2026-10-09T08:00:00Z"),
  row(2, "FL-AR-04", "AeroStall Ultra Trans", "AIR", "VA-A892", "Air Freight Pod", "Boeing", "777-F Module", 3, "IN_USE", "2026-08-31", "2026-09-30", "[AIR SUSPENSION DAMPING]\nPressurized Cabin, Biometric Monitoring", "2026-10-08T08:00:00Z"),
  row(3, "FL-RD-18", "Pegaxus Titan Cruiser", "ROAD", "51D-401.99", "Long Hauler", "Scania", "R500", 6, "MAINTENANCE", "2026-09-15", "2027-01-31", "Hydraulic Tailgate, 360° Cam", "2026-10-07T08:00:00Z"),
  row(4, "FL-SE-02", "Sea Equine Pod X", "SEA", "SEA-8812", "Maritime Container", "Hanjin", "40ft High Cube Module", 8, "AVAILABLE", "2027-01-31", "2027-02-28", "Anti-Roll Gyro Stabilizer, Auto Drinking Trough", "2026-10-06T08:00:00Z"),
  row(5, "FL-RD-07", "Emerald Express Van", "ROAD", "30F-124.88", "Enclosed Box Van", "Mercedes", "Actros", 2, "ASSIGNED", "2026-10-31", "2026-11-30", "Padded Partitions, Emergency Hoist", "2026-10-05T08:00:00Z"),
  row(6, "FL-RD-22", "Royal Ascot Carrier", "ROAD", "43A-671.30", "Specialized Transporter", "MAN", "TGX", 4, "INACTIVE", "2026-10-31", "2026-09-01", "Thermal Biometric Cam, Auto Drinking Trough", "2026-10-04T08:00:00Z"),
  row(7, "FL-RD-15", "Kildare Stud Shuttle", "ROAD", "60B-331.02", "Specialized Shuttle", "DAF", "XF", 2, "AVAILABLE", "2026-12-31", "2026-12-31", "Hydraulic Side Ramp, CCTV", "2026-10-03T08:00:00Z"),
  row(8, "FL-RD-09", "Curragh Runner", "ROAD", "29H-205.77", "Specialized Transporter", "Volvo", "FH", 5, "AVAILABLE", "2027-03-31", "2027-03-31", "[MULTI-ZONE CLIMATE CONTROL; EMERGENCY RESCUE HOIST]", "2026-10-02T08:00:00Z"),
  row(9, "FL-RD-10", "Newmarket Voyager", "ROAD", "29H-206.12", "Long Hauler", "Scania", "S450", 6, "AVAILABLE", "2027-02-28", "2027-02-28", "Thermal Biometric Cam", "2026-10-01T08:00:00Z"),
  row(10, "FL-RD-11", "Chantilly Express", "ROAD", "92B-118.45", "Enclosed Box Van", "Iveco", "S-Way", 3, "MAINTENANCE", "2026-12-15", "2027-01-15", "Padded Partitions", "2026-09-30T08:00:00Z"),
  row(11, "FL-RD-12", "Deauville Courier", "ROAD", "75C-909.01", "Specialized Shuttle", "Renault", "T High", 2, "AVAILABLE", "2026-10-14", "2026-12-20", "CCTV", "2026-09-29T08:00:00Z"),
  row(12, "FL-AR-05", "AeroStall Light", "AIR", "VA-B514", "Air Freight Pod", "Airbus", "A330-F Module", 4, "AVAILABLE", "2027-04-30", "2027-04-30", "Pressurized Cabin", "2026-09-28T08:00:00Z"),
  ...Array.from({ length: 8 }, (_, index) =>
    row(
      13 + index,
      `FL-RD-${30 + index}`,
      `Pegaxus Horse Truck ${index + 1}`,
      "ROAD",
      `29C-${900 + index}.${10 + index}`,
      "Specialized Transporter",
      index % 2 ? "Scania" : "Volvo",
      index % 2 ? "R450" : "FH16",
      2 + (index % 8),
      index % 3 === 0 ? "ASSIGNED" : "AVAILABLE",
      "2027-05-31",
      "2027-06-30",
      "[ANTI-VIBRATION BULKHEADS]",
      `2026-09-${String(27 - index).padStart(2, "0")}T08:00:00Z`,
    ),
  ),
]

export const MOCK_VEHICLE_ASSIGNMENTS: Record<string, VehicleAssignment[]> = {
  [id(5)]: [
    {
      routePlanRouteId: id(9001),
      routePlanId: id(9101),
      routePlanCode: "RP-20261001-0001",
      transportPlanId: id(9201),
      planCode: "TP-20261001-0001",
      sequenceNo: 1,
      fromLocationName: "Paris Stable",
      toLocationName: "Paris CDG Airport",
      plannedDepartureAt: "2026-10-27T06:00:00Z",
      plannedArrivalAt: "2026-10-27T08:00:00Z",
    },
  ],
}
