import { z } from "zod";
import {
  EMERGENCY_COST_ACTION,
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  HORSE_INCIDENT_TYPE,
  INCIDENT_ACTION,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  VEHICLE_INCIDENT_TYPE,
} from "@/shared/constants/incident";

const values = <T extends Record<string, string>>(source: T) =>
  Object.values(source) as [T[keyof T], ...T[keyof T][]];
const id = z.string().trim().min(1);
const timestamp = z.iso.datetime({ offset: true });
const optionalText = z.string().trim().max(2000).optional();
const photoFileSchema = z.object({ publicId: id });

export const incidentCategorySchema = z.enum(values(INCIDENT_CATEGORY));
export const incidentSeveritySchema = z.enum(values(INCIDENT_SEVERITY));
export const incidentStatusSchema = z.enum(values(INCIDENT_STATUS));
export const vehicleIncidentTypeSchema = z.enum(values(VEHICLE_INCIDENT_TYPE));
export const horseIncidentTypeSchema = z.enum(values(HORSE_INCIDENT_TYPE));
export const incidentActionSchema = z.enum(values(INCIDENT_ACTION));
export const emergencyCostActionSchema = z.enum(values(EMERGENCY_COST_ACTION));
export const emergencyCostCategorySchema = z.enum(
  values(EMERGENCY_COST_CATEGORY),
);
export const emergencyCostStatusSchema = z.enum(values(EMERGENCY_COST_STATUS));

const photoFilesSchema = z
  .array(photoFileSchema)
  .max(5, "A maximum of 5 photos is allowed")
  .optional();
const horsePhotoFilesSchema = z
  .array(photoFileSchema)
  .max(10, "A maximum of 10 photos is allowed")
  .optional();
const coordinates = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const vehicleIncidentRequestSchema = z
  .object({
    transportId: id,
    vehicleId: id,
    category: z.enum([INCIDENT_CATEGORY.VEHICLE, INCIDENT_CATEGORY.BOTH]),
    incidentType: vehicleIncidentTypeSchema,
    severity: incidentSeveritySchema,
    description: z.string().trim().min(1).max(2000),
    immediateAction: optionalText,
    vehicleOperable: z.boolean(),
    vehicleCondition: optionalText,
    damageDescription: optionalText,
    repairRequired: z.boolean().optional(),
    towingRequired: z.boolean().optional(),
    replacementVehicleRequired: z.boolean().optional(),
    estimatedRepairCost: z.number().finite().nonnegative().optional(),
    repairNote: optionalText,
    estimatedRepairHours: z.number().finite().min(0).max(999.9).optional(),
    driverSafetyStatus: z.string().trim().max(500).optional(),
    cargoConditionNote: z.string().trim().max(500).optional(),
    emergencySettlementRequired: z.boolean(),
    occurredAt: timestamp,
    locationId: id.optional(),
    locationDescription: z.string().trim().max(1000).optional(),
    ...coordinates.shape,
    photoFiles: photoFilesSchema,
  })
  .superRefine((value, context) => {
    if (
      value.category === INCIDENT_CATEGORY.BOTH &&
      value.severity !== INCIDENT_SEVERITY.CRITICAL
    ) {
      context.addIssue({
        code: "custom",
        path: ["severity"],
        message: "BOTH incidents must use CRITICAL severity",
      });
    }
  });

export const horseHealthDetailRequestSchema = z.object({
  horseId: id,
  incidentType: horseIncidentTypeSchema,
  conditionDescription: z.string().trim().min(10).max(2000),
  symptoms: optionalText,
  bodyTemperatureCelsius: z.number().finite().optional(),
  heartRateBpm: z.number().int().nonnegative().optional(),
  respiratoryRateBpm: z.number().int().nonnegative().optional(),
  firstAidProvided: optionalText,
  veterinarianRequired: z.boolean(),
  isolationRequired: z.boolean().default(false),
  veterinarianContactedAt: timestamp.optional(),
  veterinarianInstruction: optionalText,
  medicationGiven: optionalText,
  horseTransportable: z.boolean().nullable().optional(),
});

export const horseHealthIncidentRequestSchema = z.object({
  transportId: id,
  severity: incidentSeveritySchema,
  immediateAction: optionalText,
  emergencySettlementRequired: z.boolean(),
  occurredAt: timestamp,
  locationId: id.optional(),
  locationDescription: z.string().trim().max(1000).optional(),
  ...coordinates.shape,
  horses: z
    .array(horseHealthDetailRequestSchema)
    .min(1)
    .superRefine((horses, context) => {
      if (new Set(horses.map((horse) => horse.horseId)).size !== horses.length)
        context.addIssue({
          code: "custom",
          message: "Each horse may appear only once",
        });
    }),
  photoFiles: horsePhotoFilesSchema,
});

export const addHorseDetailsRequestSchema = z.object({
  horses: horseHealthIncidentRequestSchema.shape.horses,
  photoFiles: photoFilesSchema,
});

export const supplementVehicleRequestSchema = z
  .object({
    lastUpdatedAt: timestamp,
    repairNote: optionalText,
    estimatedRepairCost: z.number().finite().nonnegative().optional(),
    vehicleOperable: z.boolean().optional(),
    repairRequired: z.boolean().optional(),
    towingRequired: z.boolean().optional(),
    replacementVehicleRequired: z.boolean().optional(),
    vehicleCondition: optionalText,
    damageDescription: optionalText,
    estimatedRepairHours: z.number().finite().min(0).max(999.9).optional(),
    driverSafetyStatus: z.string().trim().max(500).optional(),
    cargoConditionNote: z.string().trim().max(500).optional(),
    photoFiles: photoFilesSchema,
  })
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) =>
          key !== "lastUpdatedAt" &&
          key !== "photoFiles" &&
          value[key as keyof typeof value] !== undefined,
      ) || (value.photoFiles?.length ?? 0) > 0,
    "At least one vehicle detail or photo is required",
  );

export const veterinaryOutcomeRequestSchema = z
  .object({
    lastUpdatedAt: timestamp,
    outcomeNote: optionalText,
    medicationGiven: optionalText,
    veterinarianInstruction: optionalText,
    veterinarianContactedAt: timestamp.optional(),
    horseTransportable: z.boolean().nullable().optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) =>
          key !== "lastUpdatedAt" &&
          value[key as keyof typeof value] !== undefined,
      ),
    "At least one follow-up field is required",
  );

export const raiseSeverityRequestSchema = z.object({
  lastUpdatedAt: timestamp,
  severity: incidentSeveritySchema,
  reason: z.string().trim().min(10).max(2000),
});

export const incidentErrorSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});
export const apiErrorEnvelopeSchema = z.object({
  isSuccess: z.boolean().optional(),
  code: z.number().optional(),
  message: z.string().nullish(),
  errorCode: z.string().nullish(),
  errors: z.array(incidentErrorSchema).nullish(),
  value: z.unknown().optional(),
});

export type VehicleIncidentRequestInput = z.input<
  typeof vehicleIncidentRequestSchema
>;
export type HorseHealthIncidentRequestInput = z.input<
  typeof horseHealthIncidentRequestSchema
>;
export type AddHorseDetailsRequestInput = z.input<
  typeof addHorseDetailsRequestSchema
>;
export type SupplementVehicleRequestInput = z.input<
  typeof supplementVehicleRequestSchema
>;
export type VeterinaryOutcomeRequestInput = z.input<
  typeof veterinaryOutcomeRequestSchema
>;
export type RaiseSeverityRequestInput = z.input<
  typeof raiseSeverityRequestSchema
>;
