import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"

import { bookingFiltersSchema, type BookingFiltersFormValues } from "@/features/booking/schemas"
import { useDebounce } from "@/shared/hooks"

const defaultValues: BookingFiltersFormValues = {
  search: "",
  status: "ALL",
  sortBy: "createdAt:desc",
}

export function useBookingFilters(onChange: (filters: BookingFiltersFormValues) => void) {
  const form = useForm<BookingFiltersFormValues>({
    resolver: zodResolver(bookingFiltersSchema),
    defaultValues,
    mode: "onChange",
  })
  const values = useWatch({ control: form.control })
  const debouncedValues = useDebounce(values, 300)

  useEffect(() => {
    const parsed = bookingFiltersSchema.safeParse(debouncedValues)
    if (parsed.success) onChange(parsed.data)
  }, [debouncedValues, onChange])

  return form
}
