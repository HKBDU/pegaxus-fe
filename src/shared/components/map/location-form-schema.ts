import { z } from "zod";

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  type: z.string().optional(),
  address: z.string(),
  city: z.string(),
  stateProvince: z.string(),
  country: z.string().trim().min(1, "Country is required."),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  note: z.string(),
});
