import type { VehicleFormValues } from "@/features/fleet/schemas"
import type { Vehicle, VehiclePayload } from "@/features/fleet/types"
import { buildEquipment, parseEquipment } from "@/features/fleet/utils"

const emptyValues: VehicleFormValues = {
  vehicleCode: "",
  vehicleName: "",
  transportMode: "ROAD",
  licensePlate: "",
  vehicleType: "",
  manufacturer: "",
  model: "",
  capacityHorses: 4,
  registrationNumber: "",
  registrationExpiryDate: "",
  insuranceNumber: "",
  insuranceExpiryDate: "",
  equipmentTags: [],
  equipmentNotes: "",
  country: "",
}

/** Vehicle (or nothing, for create) to form values. */
export function toVehicleDefaults(vehicle?: Vehicle): VehicleFormValues {
  if (!vehicle) return emptyValues
  const equipment = parseEquipment(vehicle.specialEquipment)
  return {
    vehicleCode: vehicle.vehicleCode,
    vehicleName: vehicle.vehicleName ?? "",
    transportMode: vehicle.transportMode,
    licensePlate: vehicle.licensePlate ?? "",
    vehicleType: vehicle.vehicleType ?? "",
    manufacturer: vehicle.manufacturer ?? "",
    model: vehicle.model ?? "",
    capacityHorses: vehicle.capacityHorses,
    registrationNumber: vehicle.registrationNumber ?? "",
    registrationExpiryDate: vehicle.registrationExpiryDate ?? "",
    insuranceNumber: vehicle.insuranceNumber ?? "",
    insuranceExpiryDate: vehicle.insuranceExpiryDate ?? "",
    equipmentTags: equipment.tags,
    equipmentNotes: equipment.notes,
    country: vehicle.country ?? "",
  }
}

/** Blank optional text is omitted so the BE stores null, not "". */
const optional = (value: string) => value.trim() || undefined

/** Form values to the VH3 payload. */
export function toVehiclePayload(values: VehicleFormValues): VehiclePayload {
  return {
    vehicleCode: values.vehicleCode.trim(),
    vehicleName: optional(values.vehicleName),
    // Internal fleet is road-only: the mode is a constant, not a user choice.
    transportMode: "ROAD",
    licensePlate: optional(values.licensePlate),
    vehicleType: optional(values.vehicleType),
    manufacturer: optional(values.manufacturer),
    model: optional(values.model),
    capacityHorses: values.capacityHorses,
    registrationNumber: optional(values.registrationNumber),
    registrationExpiryDate: optional(values.registrationExpiryDate),
    insuranceNumber: optional(values.insuranceNumber),
    insuranceExpiryDate: optional(values.insuranceExpiryDate),
    specialEquipment: buildEquipment(values.equipmentTags, values.equipmentNotes),
    country: optional(values.country)?.toUpperCase(),
  }
}
