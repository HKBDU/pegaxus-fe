import type { HorseSex } from "../types"

export const HORSE_SEX_LABELS: Record<HorseSex, string> = {
  MALE: "Male",
  FEMALE: "Female",
  GELDING: "Gelding",
}

export const HORSE_SEX_OPTIONS = [
  { value: "ALL", label: "All Sexes" },
  { value: "MALE", label: HORSE_SEX_LABELS.MALE },
  { value: "FEMALE", label: HORSE_SEX_LABELS.FEMALE },
  { value: "GELDING", label: HORSE_SEX_LABELS.GELDING },
] as const

export const HORSE_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Horse Name" },
] as const

export const HORSE_BREED_OPTIONS = [
  { value: "ALL", label: "All Breeds" },
  { value: "Thoroughbred", label: "Thoroughbred" },
  { value: "Arabian", label: "Arabian" },
  { value: "Warmblood", label: "Warmblood" },
  { value: "Andalusian", label: "Andalusian" },
] as const
