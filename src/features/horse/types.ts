import type { ReactNode } from "react"

export type HorseSex = "MALE" | "FEMALE" | "GELDING"

export type Horse = {
  horseId: number
  horseName: string
  sex: HorseSex | null
  breed: string | null
  dateOfBirth: string | null
  color?: string | null
  countryOfOrigin: string | null
  weightKg?: number | null
  heightCm?: number | null
  passportNumber: string | null
  microchipNumber: string | null
  identificationNotes?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateHorseRequest = {
  horseName: string
  sex?: HorseSex
  breed?: string
  dateOfBirth?: string
  color?: string
  countryOfOrigin?: string
  weightKg?: number
  heightCm?: number
  passportNumber?: string
  microchipNumber?: string
  identificationNotes?: string
}

export type HorseFormValues = {
  horseName: string
  sex: string
  breed: string
  dateOfBirth: string
  color: string
  countryOfOrigin: string
  weightKg: string
  heightCm: string
  passportNumber: string
  microchipNumber: string
  identificationNotes: string
}

export type HorseListValue = {
  items: Horse[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type HorseApiResponse<T> = {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export type HorseListParams = {
  pageIndex?: number
  pageSize?: number
  search?: string
}

export type HorsePageStateProps = {
  message: string
  onRetry?: () => void
}

export type HorseTableAction = "view" | "edit" | "remove"

export type HorseSectionName = "BASIC INFORMATION" | "IMMUTABLE INFORMATION"

export type HorseAccordionSectionProps = {
  title: HorseSectionName
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export type HorseTableProps = {
  horses: Horse[]
  onAction: (horse: Horse, action: HorseTableAction) => void
  toolbar?: ReactNode
}
