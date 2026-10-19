import { z } from "zod";
import {
  VALIDATION_LIMITS,
  countDecimalPlaces,
} from "@/shared/constants/validation-limits";

export const locationFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(200, "Name must be at most 200 characters."),
    type: z.string().optional(),
    address: z.string(),
    city: z.string(),
    stateProvince: z.string(),
    country: z.string().trim().min(1, "Country is required."),
    latitude: z
      .number()
      .finite()
      .min(VALIDATION_LIMITS.latitude.min)
      .max(VALIDATION_LIMITS.latitude.max)
      .refine(
        (val) => countDecimalPlaces(val) <= VALIDATION_LIMITS.coordinateScale,
        "Latitude must have at most 4 decimal places.",
      ),
    longitude: z
      .number()
      .finite()
      .min(VALIDATION_LIMITS.longitude.min)
      .max(VALIDATION_LIMITS.longitude.max)
      .refine(
        (val) => countDecimalPlaces(val) <= VALIDATION_LIMITS.coordinateScale,
        "Longitude must have at most 4 decimal places.",
      ),
    note: z.string().max(VALIDATION_LIMITS.noteMaxLength, `Note must be at most ${VALIDATION_LIMITS.noteMaxLength} characters.`),
  })
  .superRefine((data, ctx) => {
    if (data.latitude === 0 && data.longitude === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Latitude and longitude must not both be 0.",
      });
    }
  });
