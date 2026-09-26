import { zodResolver } from "@hookform/resolvers/zod"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table"
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import { releaseEditLock } from "@/features/booking/editLock"
import { useAvailableHorses, useBookingEditLock, useCreateBooking, useUpdateBooking } from "@/features/booking/hooks"
import { bookingFormSchema, type BookingFormSchemaValues } from "@/features/booking/schemas"
import type { AvailableHorse, Booking, BookingFormValues } from "@/features/booking/types"
import { formatSex, getBookingErrorMessage } from "@/features/booking/utils"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { Pagination } from "@/shared/components/common/Pagination"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Textarea } from "@/shared/components/ui/textarea"
import { useDebounce } from "@/shared/hooks/useDebounce"
import type { EntityId } from "@/shared/types"

const transportFields = [
  "originAddress",
  "originCountry",
  "destinationAddress",
  "destinationCountry",
  "requestedDepartureDate",
  "requestedArrivalDate",
] as const

type TransportField = (typeof transportFields)[number]

const NOTE_LIMIT = 500

const panelClass = "border border-[#e5e2d9] bg-white"
const backLinkClass =
  "group mb-1 inline-flex items-center gap-1.5 font-heading text-sm font-medium normal-case tracking-normal text-primary transition-colors hover:text-primary-hover"
const headingClass = "m-0! font-heading font-bold! tracking-normal! text-primary! uppercase"
const cardTitleClass = "m-0! font-heading font-bold! tracking-normal! text-primary! uppercase"
const fieldLabelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.04em] text-[#181818]"
const fieldControlClass =
  "h-8 rounded-[2px] border-[#f3aa3b] bg-transparent px-3 text-xs text-[#181818] shadow-none md:text-xs placeholder:text-[#6c6963] focus-visible:border-primary focus-visible:ring-primary/20"
const filterControlClass = "h-8 rounded-[2px] border-slate-300 bg-white text-xs text-gray-700 shadow-none data-[size=default]:h-8 focus:border-amber-500 focus:ring-amber-500/20"
const filterContentClass = "rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md"
const filterItemClass = "h-7 rounded-[2px] text-xs"

function toDefaultValues(booking?: Booking): BookingFormValues {
  return {
    originAddress: booking?.originAddress ?? "",
    originCountry: booking?.originCountry ?? "",
    destinationAddress: booking?.destinationAddress ?? "",
    destinationCountry: booking?.destinationCountry ?? "",
    requestedDepartureDate: booking?.requestedDepartureDate ?? "",
    requestedArrivalDate: booking?.requestedArrivalDate ?? "",
    specialRequirements: booking?.specialRequirements ?? "",
    customerNote: booking?.customerNote ?? "",
    horses: booking?.horses.map((horse) => ({
      horseId: horse.horseId,
      specialHandlingNotes: horse.specialHandlingNotes ?? "",
    })) ?? [],
  }
}


function BookingSteps({ step }: { step: 1 | 2 }) {
  const items = [
    { number: 1, title: "Transport details" },
    { number: 2, title: "Racehorses & trip requirements" },
  ]

  return (
    <ol
      className="relative grid grid-cols-2 border border-[#e9e6de] bg-white"
      aria-label="Booking form progress"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-0 z-10 h-[3px] w-1/2 bg-primary transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none",
          step === 2 && "translate-x-full",
        )}
      />
      {items.map((item) => {
        const active = step === item.number
        return (
          <li
            key={item.number}
            aria-current={active ? "step" : undefined}
            className={cn(
              "relative px-3 py-2 sm:px-4",
              item.number === 1 && "border-r border-[#e9e6de]",
              active && "bg-[#f9f8f6]",
            )}
          >
            <span
              className={cn(
                "block font-heading text-[10px] font-medium uppercase leading-[14px] tracking-[0.08em]",
                active ? "text-primary" : "text-gray-400",
              )}
            >
              Step {String(item.number).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "mt-px block font-heading text-sm font-semibold uppercase leading-5",
                active ? "text-[#181818]" : "text-gray-600",
              )}
            >
              {item.title}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function BookingField({
  control,
  name,
  label,
  placeholder,
  type = "text",
  min,
}: {
  control: ReturnType<typeof useForm<BookingFormSchemaValues>>["control"]
  name: TransportField
  label: string
  placeholder?: string
  type?: "text" | "date"
  min?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className={fieldLabelClass}>{label}</FormLabel>
          <FormControl>
            {type === "date" ? (
              <DatePicker
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                minDate={min}
                placeholder="DD / MM / YYYY"
                className={cn(fieldControlClass, "data-[empty=true]:text-[#6c6963]")}
              />
            ) : (
              <Input
                {...field}
                placeholder={placeholder}
                className={fieldControlClass}
              />
            )}
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

function FormSection({ title, className, offsetTitle = false, children }: { title: string; className?: string; offsetTitle?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("grid gap-2 border-b border-[#1f1e1d] py-3 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-4", className)}>
      <h2 className={cn("m-0! font-heading text-xl! leading-7! font-bold! tracking-normal! text-black! uppercase", offsetTitle && "lg:pt-1")}>{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function SummaryCell({ label, first = false, children }: { label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative min-w-0 py-2.5",
        !first && "lg:pl-4 lg:before:absolute lg:before:inset-y-2.5 lg:before:left-0 lg:before:w-px lg:before:bg-gray-200",
      )}
    >
      <dt className="font-heading text-[10px] font-medium uppercase leading-4 tracking-[0.1em] text-gray-400">{label}</dt>
      <dd className="mt-0.5 flex min-h-5 items-center text-sm leading-5 font-semibold text-gray-900">{children}</dd>
    </div>
  )
}

function FilterSelect({
  value,
  onValueChange,
  allLabel,
  options,
}: {
  value: string
  onValueChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(filterControlClass, "w-full")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={2} className={filterContentClass}>
        <SelectItem value="ALL" className={filterItemClass}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className={filterItemClass}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function BookingForm({ mode, booking, onSaveFailed }: { mode: "create" | "edit"; booking?: Booking; onSaveFailed?: (error: unknown) => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [horseSearch, setHorseSearch] = useState("")
  const [breedFilter, setBreedFilter] = useState("ALL")
  const [sexFilter, setSexFilter] = useState("ALL")
  const [horsePage, setHorsePage] = useState(1)
  const [horsePageSize, setHorsePageSize] = useState(5)
  const [horseSorting, setHorseSorting] = useState<SortingState>([])
  const debouncedHorseSearch = useDebounce(horseSearch, 300)
  const [activeHorseId, setActiveHorseId] = useState<EntityId | null>(booking?.horses[0]?.horseId ?? null)
  const [selectedHorseDetails, setSelectedHorseDetails] = useState<AvailableHorse[]>(booking?.horses ?? [])
  const horsesQuery = useAvailableHorses({ pageIndex: horsePage, pageSize: horsePageSize, search: debouncedHorseSearch })
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()
  const form = useForm<BookingFormSchemaValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: toDefaultValues(booking),
  })

  const selectedHorses = form.watch("horses")
  const selectedIds = useMemo(() => new Set(selectedHorses.map((horse) => horse.horseId)), [selectedHorses])
  const horseResults = useMemo(() => horsesQuery.data?.data ?? [], [horsesQuery.data?.data])
  const breeds = useMemo(() => [...new Set(horseResults.map((horse) => horse.breed).filter((breed): breed is string => Boolean(breed)))].sort(), [horseResults])
  const availableHorses = useMemo(() => horseResults.filter((horse) => {
    if (breedFilter !== "ALL" && horse.breed !== breedFilter) return false
    if (sexFilter !== "ALL" && horse.sex !== sexFilter) return false
    return true
  }), [breedFilter, horseResults, sexFilter])
  const horseCatalog = useMemo(() => {
    const catalog = new Map<EntityId, AvailableHorse>()
    selectedHorseDetails.forEach((horse) => catalog.set(horse.horseId, horse))
    horseResults.forEach((horse) => catalog.set(horse.horseId, horse))
    return catalog
  }, [horseResults, selectedHorseDetails])
  const activeHorse = activeHorseId ? horseCatalog.get(activeHorseId) : undefined
  const activeHorseIndex = selectedHorses.findIndex((horse) => horse.horseId === activeHorseId)
  const activeNoteLength = activeHorseIndex >= 0 ? (selectedHorses[activeHorseIndex]?.specialHandlingNotes ?? "").length : 0
  const isPending = createBooking.isPending || updateBooking.isPending
  const exitPath = booking ? `/bookings/${booking.bookingId}` : "/bookings"
  // Leaving without saving: an edited booking goes back to PENDING before we return to it.
  const cancel = async () => {
    if (mode === "edit" && booking) await releaseEditLock(booking.bookingId)
    navigate(exitPath)
  }

  const toggleHorse = useCallback((horse: AvailableHorse, selected: boolean) => {
    const current = form.getValues("horses")
    if (selected) {
      if (!current.some((item) => item.horseId === horse.horseId)) {
        form.setValue("horses", [...current, { horseId: horse.horseId, specialHandlingNotes: "" }], { shouldDirty: true, shouldValidate: true })
        setSelectedHorseDetails((items) => items.some((item) => item.horseId === horse.horseId) ? items : [...items, horse])
      }
      setActiveHorseId(horse.horseId)
      return
    }
    const next = current.filter((item) => item.horseId !== horse.horseId)
    form.setValue("horses", next, { shouldDirty: true, shouldValidate: true })
    setSelectedHorseDetails((items) => items.filter((item) => item.horseId !== horse.horseId))
    if (activeHorseId === horse.horseId) setActiveHorseId(next[0]?.horseId ?? null)
  }, [activeHorseId, form])

  const allVisibleHorsesSelected = availableHorses.length > 0 && availableHorses.every((horse) => selectedIds.has(horse.horseId))
  const someVisibleHorsesSelected = availableHorses.some((horse) => selectedIds.has(horse.horseId)) && !allVisibleHorsesSelected

  const toggleVisibleHorses = useCallback((selected: boolean) => {
    const visibleIds = new Set(availableHorses.map((horse) => horse.horseId))
    const current = form.getValues("horses")

    if (selected) {
      const currentIds = new Set(current.map((horse) => horse.horseId))
      const next = [...current, ...availableHorses
        .filter((horse) => !currentIds.has(horse.horseId))
        .map((horse) => ({ horseId: horse.horseId, specialHandlingNotes: "" }))]
      form.setValue("horses", next, { shouldDirty: true, shouldValidate: true })
      setSelectedHorseDetails((items) => {
        const itemIds = new Set(items.map((horse) => horse.horseId))
        return [...items, ...availableHorses.filter((horse) => !itemIds.has(horse.horseId))]
      })
      if (!activeHorseId && availableHorses[0]) setActiveHorseId(availableHorses[0].horseId)
      return
    }

    const next = current.filter((horse) => !visibleIds.has(horse.horseId))
    form.setValue("horses", next, { shouldDirty: true, shouldValidate: true })
    setSelectedHorseDetails((items) => items.filter((horse) => !visibleIds.has(horse.horseId)))
    if (activeHorseId && visibleIds.has(activeHorseId)) setActiveHorseId(next[0]?.horseId ?? null)
  }, [activeHorseId, availableHorses, form])

  const horseColumns = useMemo<ColumnDef<AvailableHorse>[]>(() => [
    {
      id: "select",
      header: () => (
        <div className="flex justify-center">
          <Checkbox
            checked={allVisibleHorsesSelected ? true : someVisibleHorsesSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => toggleVisibleHorses(Boolean(checked))}
            aria-label="Select all horses on this page"
            className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white"
          />
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={selectedIds.has(row.original.horseId)}
            onCheckedChange={(checked) => toggleHorse(row.original, checked === true)}
            aria-label={`Select ${row.original.horseName}`}
            className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
          />
        </div>
      ),
    },
    {
      accessorKey: "horseName",
      header: "HORSE NAME",
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.horseName}</span>,
    },
    { accessorKey: "breed", header: "BREED" },
    {
      accessorKey: "sex",
      header: "SEX",
      cell: ({ row }) => formatSex(row.original.sex),
    },
    { accessorKey: "microchipNumber", header: "MICROCHIP NUMBER" },
  ], [allVisibleHorsesSelected, selectedIds, someVisibleHorsesSelected, toggleHorse, toggleVisibleHorses])

  const horseTable = useReactTable({
    data: availableHorses,
    columns: horseColumns,
    state: { sorting: horseSorting },
    onSortingChange: setHorseSorting,
    getRowId: (horse) => String(horse.horseId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const stepActiveHorse = (offset: 1 | -1) => {
    if (selectedHorses.length < 2 || activeHorseIndex < 0) return
    const next = (activeHorseIndex + offset + selectedHorses.length) % selectedHorses.length
    setActiveHorseId(selectedHorses[next].horseId)
  }

  const continueToHorses = async () => {
    const valid = await form.trigger(transportFields, { shouldFocus: true })
    if (valid) setStep(2)
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        const result = await createBooking.mutateAsync({
          originAddress: values.originAddress,
          originCountry: values.originCountry,
          destinationAddress: values.destinationAddress,
          destinationCountry: values.destinationCountry,
          requestedDepartureDate: values.requestedDepartureDate,
          requestedArrivalDate: values.requestedArrivalDate || undefined,
          horses: values.horses,
          specialRequirements: values.specialRequirements || undefined,
          customerNote: values.customerNote || undefined,
        })
        toast.success(`Booking ${result.bookingCode} created`)
        navigate(`/bookings/${result.bookingId}`, { replace: true })
      } else if (booking) {
        await updateBooking.mutateAsync({ booking, values })
        toast.success("Booking updated")
        navigate(`/bookings/${booking.bookingId}`, { replace: true })
      }
    } catch (error) {
      toast.error(getBookingErrorMessage(error, `Unable to ${mode === "create" ? "create" : "update"} this booking`))
      onSaveFailed?.(error)
    }
  })

  const compactButton = "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60"
  const largeButton = "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border px-5 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

  return (
    <Form {...form}>
      <form onSubmit={submit} className="min-h-[70dvh] bg-[#f4f2ed] px-4 pt-5 pb-8 sm:px-10 lg:px-16">
        <div className="booking-page-enter mx-auto w-full max-w-[1200px]">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} className={cn(backLinkClass, "mb-2")}>
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
              Return to transport details
            </button>
          ) : (
            <Link to={exitPath} className={cn(backLinkClass, "mb-2")}>
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
              {booking ? "Return to booking details" : "Return to booking list"}
            </Link>
          )}

          <div className="mb-3">
            <h1 className={cn(headingClass, "text-[28px]! leading-[1.1]! sm:text-[32px]!")}>
              {step === 2 ? "Select racehorses" : mode === "create" ? "Create booking" : "Update booking"}
            </h1>
            {step === 2 ? (
              <p className="mt-0.5! text-xs leading-4 text-gray-600">
                Choose racehorses for this booking request and enter individual notes for each selected horse.
              </p>
            ) : null}
          </div>

          <BookingSteps step={step} />

          {step === 1 ? (
            <div className="mt-2 lg:px-8">
              <FormSection title="Route information">
                <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  <BookingField control={form.control} name="originCountry" label="Pickup country *" placeholder="Enter pickup country..." />
                  <BookingField control={form.control} name="destinationCountry" label="Destination country *" placeholder="Enter destination country..." />
                  <BookingField control={form.control} name="originAddress" label="Pickup address *" placeholder="Enter pickup stable or racecourse address..." />
                  <BookingField control={form.control} name="destinationAddress" label="Destination address *" placeholder="Enter destination stable or racecourse address..." />
                </div>
              </FormSection>

              <FormSection title="Schedule" offsetTitle>
                <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  <BookingField control={form.control} name="requestedDepartureDate" label="Expected departure date *" type="date" />
                  <BookingField control={form.control} name="requestedArrivalDate" label="Expected arrival date" type="date" min={form.watch("requestedDepartureDate")} />
                </div>
              </FormSection>

              <FormSection title="Notes" offsetTitle>
                <FormField control={form.control} name="specialRequirements" render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className={fieldLabelClass}>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={1}
                        className={cn(fieldControlClass, "field-sizing-content h-auto min-h-8 max-h-24 resize-none overflow-y-auto py-2 leading-4")}
                        placeholder="Any initial boarding requirements, custom clearance notes, etc..."
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </FormSection>

              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className={cn(largeButton, "border-[#4f4e4d] bg-transparent text-[#181818] hover:bg-black/5")} onClick={() => void cancel()}>
                  Cancel
                </button>
                <button type="button" className={cn(largeButton, "border-primary bg-primary text-[#181818] hover:border-primary-hover hover:bg-primary-hover")} onClick={() => void continueToHorses()}>
                  Save &amp; continue
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-5 sm:px-7 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
                <SummaryCell first label="Booking code">{booking?.bookingCode ?? "Generated after submit"}</SummaryCell>
                <SummaryCell label="Route">
                  {form.getValues("originCountry")}
                  <ArrowRight className="mx-1.5 size-3.5 shrink-0 text-gray-500" aria-hidden="true" />
                  {form.getValues("destinationCountry")}
                </SummaryCell>
                <SummaryCell label="Status">
                  <BookingStatusBadge status="PENDING" />
                </SummaryCell>
                <SummaryCell label="Selected racehorses">{selectedHorses.length}</SummaryCell>
              </dl>

              <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
                <section className={cn(panelClass, "p-3")}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={cn(cardTitleClass, "text-lg! leading-6!")}>Available racehorses</h2>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-[2px] bg-primary px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-950 transition-colors hover:bg-primary-hover"
                      onClick={() => toast.info("Adding a new racehorse is not available yet")}
                    >
                      <Plus className="size-3" strokeWidth={3} aria-hidden="true" /> Add new racehorse
                    </button>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 lg:grid-cols-[minmax(0,1fr)_112px_112px_124px_auto]">
                    <div className="relative order-1 col-span-2 lg:order-none lg:col-span-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={horseSearch}
                        onChange={(event) => { setHorseSearch(event.target.value); setHorsePage(1) }}
                        className="h-8 rounded-[2px] border-slate-300 bg-white pr-8 pl-8 text-xs text-gray-900 shadow-none md:text-xs placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20"
                        placeholder="Search by horse name or microchip number..."
                      />
                      {horseSearch ? (
                        <button type="button" aria-label="Clear horse search" onClick={() => { setHorseSearch(""); setHorsePage(1) }} className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <div className="order-3 col-span-3 grid grid-cols-2 gap-2 lg:order-none lg:contents">
                      <FilterSelect value={breedFilter} onValueChange={(value) => { setBreedFilter(value); setHorsePage(1) }} allLabel="All breeds" options={breeds.map((breed) => ({ value: breed, label: breed }))} />
                      <FilterSelect value={sexFilter} onValueChange={(value) => { setSexFilter(value); setHorsePage(1) }} allLabel="All sexes" options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "GELDING", label: "Gelding" }]} />
                    </div>
                    <div className="order-2 col-span-1 lg:order-none lg:col-span-1 max-lg:[&_button]:w-full">
                      <DataTableViewOptions table={horseTable} />
                    </div>
                  </div>

                  <div className="mt-2.5">
                    {horsesQuery.isLoading ? <Skeleton className="h-48 rounded-[2px]" /> : null}
                    {horsesQuery.isError ? <ErrorState message="Unable to load your horses." onRetry={() => void horsesQuery.refetch()} /> : null}
                    {horsesQuery.data ? (
                      <DataTable
                        table={horseTable}
                        tableClassName="min-w-[760px]"
                        containerClassName="overflow-x-auto rounded-[2px] border-[#e5e2d9]"
                        headerClassName="bg-[#e9e6de]"
                        headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
                        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
                        cellClassName="h-11 truncate px-2.5 py-1.5 text-xs text-slate-700"
                        emptyMessage="No horses match these filters."
                        footer={
                          <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                              Showing {horsesQuery.data.meta.totalItems === 0 ? 0 : (horsesQuery.data.meta.currentPage - 1) * horsesQuery.data.meta.itemsPerPage + 1}
                              {" "}to {Math.min(horsesQuery.data.meta.currentPage * horsesQuery.data.meta.itemsPerPage, horsesQuery.data.meta.totalItems)} of {horsesQuery.data.meta.totalItems} entries
                            </p>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <div className="flex items-center gap-2">
                                <span className="whitespace-nowrap font-sans text-[11px] font-normal text-gray-500">Rows per page</span>
                                <Select value={String(horsePageSize)} onValueChange={(value) => { setHorsePageSize(Number(value)); setHorsePage(1) }}>
                                  <SelectTrigger className="h-8 w-12 gap-1 rounded-[2px] bg-white px-2 text-xs data-[size=default]:h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent position="popper" side="bottom" align="end" sideOffset={2} avoidCollisions={false} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
                                    {[5, 10, 20].map((size) => <SelectItem key={size} value={String(size)} className="h-7 rounded-[2px] text-xs">{size}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Pagination meta={horsesQuery.data.meta} onPageChange={setHorsePage} />
                            </div>
                          </div>
                        }
                      />
                    ) : null}
                  </div>
                </section>

                <div className="space-y-3">
                  <section className={cn(panelClass, "p-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className={cn(cardTitleClass, "text-[17px]! leading-6!")}>Selected racehorses ({selectedHorses.length})</h2>
                      {selectedHorses.length ? (
                        <button
                          type="button"
                          className="text-xs text-gray-500 underline underline-offset-2 transition-colors hover:text-primary"
                          onClick={() => { form.setValue("horses", [], { shouldDirty: true, shouldValidate: true }); setSelectedHorseDetails([]); setActiveHorseId(null) }}
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {selectedHorses.length === 0 ? <p className="py-3 text-center text-xs text-gray-500">No horses selected yet.</p> : null}
                      {selectedHorses.map((selected) => {
                        const horse = horseCatalog.get(selected.horseId)
                        if (!horse) return null
                        const active = activeHorseId === horse.horseId
                        return (
                          <div key={horse.horseId} className={cn("flex items-center border border-[#eeece6] bg-white transition-colors hover:border-gray-300", active && "border-l-4 border-l-primary")}>
                            <button type="button" onClick={() => setActiveHorseId(horse.horseId)} className="min-w-0 flex-1 px-3 py-1.5 text-left">
                              <strong className="block truncate text-[13px] leading-[18px] font-semibold text-gray-900">{horse.horseName}</strong>
                              <span className="block truncate text-xs leading-4 text-gray-500">{horse.microchipNumber}</span>
                            </button>
                            <button
                              type="button"
                              className="mr-3 grid size-6 shrink-0 place-items-center text-gray-400 transition-colors hover:text-red-600"
                              onClick={() => toggleHorse(horse, false)}
                              aria-label={`Remove ${horse.horseName}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-2.5! flex items-center gap-2 text-[11px] leading-4 text-gray-500">
                      <span className="grid size-3.5 shrink-0 place-items-center rounded-full bg-gray-400 text-[9px] font-bold text-white" aria-hidden="true">i</span>
                      Select a horse to edit its individual transport note.
                    </p>
                  </section>

                  <section className={cn(panelClass, "p-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className={cn(cardTitleClass, "text-[17px]! leading-6!")}>Edit horse note</h2>
                      {activeHorseIndex >= 0 ? (
                        <div className="flex items-center gap-1.5 font-heading text-[11px] font-semibold text-gray-900">
                          <button type="button" className="grid size-4 place-items-center hover:text-primary disabled:opacity-40" onClick={() => stepActiveHorse(-1)} disabled={selectedHorses.length < 2} aria-label="Previous horse"><ChevronLeft className="size-3" /></button>
                          {activeHorseIndex + 1} of {selectedHorses.length}
                          <button type="button" className="grid size-4 place-items-center hover:text-primary disabled:opacity-40" onClick={() => stepActiveHorse(1)} disabled={selectedHorses.length < 2} aria-label="Next horse"><ChevronRight className="size-3" /></button>
                        </div>
                      ) : null}
                    </div>
                    {activeHorse && activeHorseIndex >= 0 ? (
                      <div className="mt-2">
                        <p className="text-[13px] leading-[18px] font-semibold text-gray-900">{activeHorse.horseName}</p>
                        <p className="text-xs leading-4 text-gray-500">{activeHorse.microchipNumber}</p>
                        <FormField control={form.control} name={`horses.${activeHorseIndex}.specialHandlingNotes`} render={({ field }) => (
                          <FormItem className="mt-2 gap-1">
                            <FormLabel className="text-xs leading-4 font-normal text-gray-600">Special handling notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                maxLength={NOTE_LIMIT}
                                className="field-sizing-fixed h-14 min-h-14 resize-none rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-gray-900 shadow-none md:text-xs placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-primary/20"
                                placeholder="Diet, loading or welfare notes for this horse"
                              />
                            </FormControl>
                            <p className="text-right text-xs leading-4 text-gray-300">{activeNoteLength}/{NOTE_LIMIT}</p>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )} />
                      </div>
                    ) : <p className="mt-3! text-sm text-gray-500">Select a horse to add an individual note.</p>}
                  </section>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 pt-1 sm:flex-row">
                <button type="button" className={cn(compactButton, "border-gray-300 bg-white text-gray-900 hover:bg-gray-50")} onClick={() => void cancel()}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className={cn(compactButton, "border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover")}>
                  {isPending ? "Saving..." : "Save & continue"}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Form>
  )
}

export default function BookingFormPage({ mode }: { mode: "create" | "edit" }) {
  const { bookingId } = useParams()
  // Edit: opening the page locks the booking (PENDING -> DRAFT); the form works on that locked snapshot.
  const lock = useBookingEditLock(mode === "edit" ? (bookingId ?? "") : undefined)
  const shell = "min-h-[70dvh] bg-[#f4f2ed] px-4 py-8 sm:px-10 lg:px-16"

  if (mode === "create") return <BookingForm mode="create" />
  if (lock.isLocking) return <div className={shell}><Skeleton className="mx-auto h-96 max-w-[1200px] rounded-[2px] bg-[#e9e6de]" /></div>
  if (lock.error || !lock.booking) {
    return <div className={shell}><div className="mx-auto max-w-[1200px]"><ErrorState message={getBookingErrorMessage(lock.error, "Unable to open this booking for editing.")} /></div></div>
  }

  return (
    <BookingForm
      key={String(lock.booking.bookingId)}
      mode="edit"
      booking={lock.booking}
      // After a failed save the server copy is the new baseline, except on a conflict: then the customer must reload.
      onSaveFailed={(error) => { if (!(error instanceof Error && error.message === "BOOKING_MODIFIED")) void lock.refresh() }}
    />
  )
}
