import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Activity, CheckCheck, ClipboardList, MapPin, NotebookPen, Pill, Save } from "lucide-react"

import { normalizeRole } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { cn } from "@/lib/utils"
import { UPLOAD_MAX_BYTES } from "@/shared/constants/upload"

import { CrewShell } from "../components/CrewShell"
import { fieldControl, fieldErrorText, fieldLabel, healthHeading, healthPanel, noticeError, noticeMuted } from "../components/health-ui"
import { HEALTH_STATUSES, HEALTH_STATUS_LABELS, HORSE_HEALTH_ROUTES, HYDRATION_STATUSES, LOG_TYPES } from "../constants"
import { fieldErrorsFrom, healthErrorMessage } from "../errors"
import { useCreateHealthLog, useHorseHealthOverview, useMarkAllNormal } from "../hooks/useHorseHealth"
import { healthLogInputSchema, markAllNormalInputSchema } from "../schemas"
import type { HealthLogInput, LogType } from "../types"

const sectionClass = `${healthPanel} space-y-3 p-4`

/** A labelled note, like the web's other forms: label (and "optional") above the shared textarea, error below. */
function NoteField({
  label,
  optional,
  field,
  value,
  onChange,
  placeholder,
  rows = 2,
  errors,
  onEdited,
}: {
  label: string
  optional?: boolean
  field: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  errors: Record<string, string>
  onEdited: (field: string) => void
}) {
  return (
    <label className={fieldLabel}>
      {label} {optional ? <span className="font-normal text-slate-400">(optional)</span> : null}
      <Textarea
        value={value}
        rows={rows}
        onChange={(event) => {
          onChange(event.target.value)
          onEdited(field)
        }}
        aria-invalid={errors[field] ? true : undefined}
        placeholder={placeholder}
        // The shared textarea grows with its content (field-sizing-content); cap it and scroll inside instead.
        className="mt-1 max-h-24 min-h-0 resize-none overflow-y-auto bg-white"
      />
      {errors[field] ? <span className={fieldErrorText}>{errors[field]}</span> : null}
    </label>
  )
}
const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")

// A typed "38,5" is read as 38.5; anything else that is not a number stays NaN so the schema flags the field.
function toNumber(value: string) {
  return value.trim() ? Number(value.trim().replace(",", ".")) : undefined
}

export default function HealthLogPage() {
  const { transportId = "" } = useParams<{ transportId: string }>()
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const isEscort = principal?.roles.some((role) => normalizeRole(role) === "ESCORT") ?? false
  const overview = useHorseHealthOverview(transportId)
  const createMutation = useCreateHealthLog(transportId)
  const markAllMutation = useMarkAllNormal(transportId)
  const horseItems = overview.data?.horses
  // A horse left behind mid-trip is no longer checked by this crew.
  const horses = (horseItems ?? []).filter((item) => !item.detachedAt)
  const [horseId, setHorseId] = useState("")
  const [logType, setLogType] = useState<LogType>("ROUTINE_CHECK")
  const [healthStatus, setHealthStatus] = useState<HealthLogInput["healthStatus"]>("NORMAL")
  const [hydrationStatus, setHydrationStatus] = useState<HealthLogInput["hydrationStatus"]>("NORMAL")
  const [temperature, setTemperature] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [respiratoryRate, setRespiratoryRate] = useState("")
  const [behaviorNote, setBehaviorNote] = useState("")
  const [feedingNote, setFeedingNote] = useState("")
  const [hydrationNote, setHydrationNote] = useState("")
  const [symptomNote, setSymptomNote] = useState("")
  const [injuryNote, setInjuryNote] = useState("")
  const [generalNote, setGeneralNote] = useState("")
  const [treatment, setTreatment] = useState("")
  const [medication, setMedication] = useState("")
  const [locationDescription, setLocationDescription] = useState("")
  const [veterinarianRequired, setVeterinarianRequired] = useState(false)
  const [veterinarianNote, setVeterinarianNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [capturedAt, setCapturedAt] = useState<(Date | null)[]>([])
  const [coordinates, setCoordinates] = useState<({ latitude: number; longitude: number } | null)[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [uploadedPublicIds, setUploadedPublicIds] = useState<string[]>([])
  const [photoUploadState, setPhotoUploadState] = useState<"idle" | "uploading" | "ready" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  /** Clears a field's message once the escort edits it. */
  const edited = (field: string) =>
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  const invalid = (field: string) => (fieldErrors[field] ? true : undefined)
  const fieldError = (field: string) =>
    fieldErrors[field] ? <span className={fieldErrorText}>{fieldErrors[field]}</span> : null
  const noteProps = { errors: fieldErrors, onEdited: edited }

  useEffect(() => {
    const first = horseItems?.find((item) => !item.detachedAt)
    if (!horseId && first) setHorseId(first.horse.horseId)
  }, [horseId, horseItems])

  if (!isEscort) {
    return (
      <CrewShell>
        <div className={`${healthPanel} mx-auto max-w-3xl p-5 text-sm text-slate-700`}>
          Only an Escort can record horse health.{" "}
          <Link className="font-semibold text-primary hover:underline" to={HORSE_HEALTH_ROUTES.health(transportId)}>
            Back to health overview
          </Link>
        </div>
      </CrewShell>
    )
  }

  if (overview.isPending) {
    return (
      <CrewShell>
        <div className="mx-auto max-w-6xl">
          <LoadingState />
        </div>
      </CrewShell>
    )
  }

  if (overview.error || !overview.data) {
    return (
      <CrewShell>
        <div className={`${noticeError} mx-auto max-w-6xl`}>
          Unable to load horse context.{" "}
          {overview.error ? healthErrorMessage(overview.error, "Please try again.") : "Please try again."}
        </div>
      </CrewShell>
    )
  }

  const isSubmitting = createMutation.isPending || markAllMutation.isPending

  const buildInput = (): HealthLogInput => ({
    horseId,
    logType,
    healthStatus,
    hydrationStatus,
    checkedAt: new Date().toISOString(),
    temperatureCelsius: toNumber(temperature),
    heartRateBpm: toNumber(heartRate),
    respiratoryRateBpm: toNumber(respiratoryRate),
    behaviorNote: behaviorNote || undefined,
    feedingNote: feedingNote || undefined,
    hydrationNote: hydrationNote || undefined,
    symptomNote: symptomNote || undefined,
    injuryNote: injuryNote || undefined,
    generalNote: generalNote || undefined,
    treatmentProvided: treatment || undefined,
    medicationGiven: medication || undefined,
    veterinarianRequired,
    veterinarianNote: veterinarianRequired ? veterinarianNote || undefined : undefined,
    locationDescription: locationDescription || undefined,
    photoPublicIds: uploadedPublicIds,
    photoCaptions: captions,
    photoCapturedAts: capturedAt.flatMap((value) => (value ? [value.toISOString()] : [])),
    photoLatitudes: coordinates.flatMap((c) => (c ? [c.latitude] : [])),
    photoLongitudes: coordinates.flatMap((c) => (c ? [c.longitude] : [])),
    latitude: coordinates[0]?.latitude,
    longitude: coordinates[0]?.longitude,
  })

  const save = async () => {
    setError(null)
    // Validate with the input schema first: invalid vitals used to go out as NaN and come back as a bare 400.
    const parsed = healthLogInputSchema.safeParse(buildInput())
    const errors = parsed.success ? {} : fieldErrorsFrom(parsed.error)
    // The schema's id is a plain string, so an empty selection passes it.
    if (!horseId) errors.horseId = "Select a horse."
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setError("Check the highlighted fields.")
      return
    }
    setFieldErrors({})
    if (files.length > 0 && uploadedPublicIds.length !== files.length) {
      setError("Please wait until every image is verified before saving.")
      return
    }
    if (photoUploadState === "uploading") {
      setError("Please wait until the image upload finishes.")
      return
    }
    if (photoUploadState === "error") {
      setError("Please remove the failed image and upload it again.")
      return
    }
    try {
      await createMutation.mutateAsync(buildInput())
      toast.success("Health log saved.")
      navigate(HORSE_HEALTH_ROUTES.health(transportId))
    } catch (cause) {
      setError(healthErrorMessage(cause, "Unable to save the health log."))
    }
  }

  const markAllNormal = async () => {
    if (!window.confirm("Mark all horses as normal?")) return
    if (photoUploadState === "uploading") {
      setError("Please wait until the image upload finishes.")
      return
    }
    if (photoUploadState === "error") {
      setError("Please remove the failed image and upload it again.")
      return
    }
    setError(null)
    if (files.length > 0 && uploadedPublicIds.length !== files.length) {
      setError("Please wait until every image is verified before marking all horses normal.")
      return
    }
    const input = {
      logType,
      checkedAt: new Date().toISOString(),
      locationDescription: locationDescription || undefined,
      generalNote: generalNote || undefined,
      photoPublicIds: uploadedPublicIds,
      latitude: coordinates[0]?.latitude,
      longitude: coordinates[0]?.longitude,
    }
    const parsed = markAllNormalInputSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error))
      setError("Check the highlighted fields.")
      return
    }
    setFieldErrors({})
    try {
      await markAllMutation.mutateAsync(input)
      toast.success("All horses marked normal.")
      navigate(HORSE_HEALTH_ROUTES.health(transportId))
    } catch (cause) {
      setError(healthErrorMessage(cause, "Unable to mark all horses normal."))
    }
  }

  const selectClass = `${fieldControl} justify-between`
  const selectedHorseName = horses.find((h) => h.horse.horseId === horseId)?.horse.horseName ?? "Select horse"

  return (
    <CrewShell>
      {/* The phone action bar grows when it carries an error, so the page keeps more room under the last field. */}
      <div className={cn("mx-auto max-w-2xl space-y-4 lg:max-w-6xl lg:pb-12 xl:max-w-7xl", error ? "pb-44" : "pb-28")}>
        <PageHeader
          title="Record horse health"
          size="compact"
          backHref={HORSE_HEALTH_ROUTES.health(transportId)}
          backLabel="Health overview"
        />

        {/* Transport context */}
        <div className={`${healthPanel} flex flex-wrap items-center justify-between gap-2 px-4 py-2.5`}>
          <p className="m-0 text-xs font-medium text-slate-500">Active transport</p>
          <div className="flex items-center gap-2">
            <span className="rounded-xs border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {horses.length} {horses.length === 1 ? "horse" : "horses"} assigned
            </span>
            <span className="rounded-xs border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {humanize(overview.data.transportStatus)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Left column: form fields */}
          <div className="space-y-4 lg:col-span-7">
            <section className={sectionClass}>
              <h2 className={healthHeading}>
                <ClipboardList aria-hidden="true" />
                Horse & log details
              </h2>
              <label className={fieldLabel}>
                Horse
                <Select
                  value={horseId}
                  onValueChange={(value) => {
                    setHorseId(value)
                    edited("horseId")
                  }}
                >
                  <SelectTrigger className={selectClass} aria-invalid={invalid("horseId")}>
                    <SelectValue placeholder="Select horse" />
                  </SelectTrigger>
                  <SelectContent>
                    {horses.map((item) => (
                      <SelectItem key={item.horse.horseId} value={item.horse.horseId}>
                        {item.horse.horseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("horseId")}
              </label>

              <label className={fieldLabel}>
                Log type
                <Select value={logType} onValueChange={(value) => setLogType(value as LogType)}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {humanize(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabel}>
                  Health status
                  <Select
                    value={healthStatus}
                    onValueChange={(value) => setHealthStatus(value as HealthLogInput["healthStatus"])}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {HEALTH_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className={fieldLabel}>
                  Hydration status
                  <Select
                    value={hydrationStatus}
                    onValueChange={(value) => setHydrationStatus(value as HealthLogInput["hydrationStatus"])}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HYDRATION_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {humanize(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className={healthHeading}>
                <Activity aria-hidden="true" />
                Vitals
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className={fieldLabel}>
                  Temperature (°C)
                  <input
                    inputMode="decimal"
                    placeholder="e.g. 38.0"
                    value={temperature}
                    onChange={(event) => {
                      setTemperature(event.target.value)
                      edited("temperatureCelsius")
                    }}
                    aria-invalid={invalid("temperatureCelsius")}
                    className={fieldControl}
                  />
                  {fieldError("temperatureCelsius")}
                </label>
                <label className={fieldLabel}>
                  Heart rate (bpm)
                  <input
                    inputMode="numeric"
                    placeholder="e.g. 36"
                    value={heartRate}
                    onChange={(event) => {
                      setHeartRate(event.target.value)
                      edited("heartRateBpm")
                    }}
                    aria-invalid={invalid("heartRateBpm")}
                    className={fieldControl}
                  />
                  {fieldError("heartRateBpm")}
                </label>
                <label className={fieldLabel}>
                  Respiratory rate (bpm)
                  <input
                    inputMode="numeric"
                    placeholder="e.g. 12"
                    value={respiratoryRate}
                    onChange={(event) => {
                      setRespiratoryRate(event.target.value)
                      edited("respiratoryRateBpm")
                    }}
                    aria-invalid={invalid("respiratoryRateBpm")}
                    className={fieldControl}
                  />
                  {fieldError("respiratoryRateBpm")}
                </label>
              </div>
              <p className="m-0 text-[11px] text-slate-500">
                Normal hints: 37.5–38.5 °C · 28–44 bpm · 8–16 bpm. Values outside the hint are allowed.
              </p>
            </section>

            <section className={sectionClass}>
              <h2 className={healthHeading}>
                <NotebookPen aria-hidden="true" />
                Field notes & observations
              </h2>
              <NoteField label="General note" field="generalNote" value={generalNote} onChange={setGeneralNote} placeholder="Overall condition at this check" rows={3} {...noteProps} />
              <div className="grid gap-3 sm:grid-cols-2">
                <NoteField label="Behavior" optional field="behaviorNote" value={behaviorNote} onChange={setBehaviorNote} placeholder="e.g. Calm, alert" {...noteProps} />
                <NoteField label="Feeding" optional field="feedingNote" value={feedingNote} onChange={setFeedingNote} placeholder="e.g. Ate full ration" {...noteProps} />
                <NoteField label="Hydration" optional field="hydrationNote" value={hydrationNote} onChange={setHydrationNote} placeholder="e.g. Drank 10 L" {...noteProps} />
                <NoteField label="Symptoms" optional field="symptomNote" value={symptomNote} onChange={setSymptomNote} placeholder="e.g. Light cough" {...noteProps} />
              </div>
              <NoteField label="Injury" optional field="injuryNote" value={injuryNote} onChange={setInjuryNote} placeholder="Describe any wound or lameness" {...noteProps} />
            </section>

            <section className={sectionClass}>
              <h2 className={healthHeading}>
                <Pill aria-hidden="true" />
                Treatment & location
              </h2>
              <label className={fieldLabel}>
                Location <span className="font-normal text-slate-400">(optional)</span>
                <Input
                  value={locationDescription}
                  onChange={(event) => {
                    setLocationDescription(event.target.value)
                    edited("locationDescription")
                  }}
                  aria-invalid={invalid("locationDescription")}
                  maxLength={500}
                  placeholder="e.g. Rest stop A4, near Dresden"
                  className="mt-1 bg-white"
                />
                {fieldError("locationDescription")}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabel}>
                  Treatment provided <span className="font-normal text-slate-400">(optional)</span>
                  <Input
                    value={treatment}
                    onChange={(event) => {
                      setTreatment(event.target.value)
                      edited("treatmentProvided")
                    }}
                    aria-invalid={invalid("treatmentProvided")}
                    placeholder="e.g. Cleaned and dressed wound"
                    className="mt-1 bg-white"
                  />
                  {fieldError("treatmentProvided")}
                </label>
                <label className={fieldLabel}>
                  Medication given <span className="font-normal text-slate-400">(optional)</span>
                  <Input
                    value={medication}
                    onChange={(event) => {
                      setMedication(event.target.value)
                      edited("medicationGiven")
                    }}
                    aria-invalid={invalid("medicationGiven")}
                    placeholder="e.g. Bute 2 g"
                    className="mt-1 bg-white"
                  />
                  {fieldError("medicationGiven")}
                </label>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <Checkbox
                  checked={veterinarianRequired}
                  onCheckedChange={(checked) => setVeterinarianRequired(checked === true)}
                />
                Veterinarian required
              </label>
              {veterinarianRequired && (
                <NoteField label="Veterinarian note" field="veterinarianNote" value={veterinarianNote} onChange={setVeterinarianNote} placeholder="What the veterinarian should know" rows={3} {...noteProps} />
              )}
            </section>
          </div>

          {/* Right column: photos and the sticky desktop action card */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-5">
            <PhotoCaptureSection
              files={files}
              capturedAt={capturedAt}
              coordinates={coordinates}
              captions={captions}
              onFilesChange={setFiles}
              onCapturedAtChange={setCapturedAt}
              onCoordinatesChange={setCoordinates}
              onCaptionsChange={setCaptions}
              onUploadedPublicIdsChange={setUploadedPublicIds}
              onUploadStateChange={setPhotoUploadState}
              presignedEntity="attachment"
              documentLabel="Health check photo"
              maxFileSizeBytes={UPLOAD_MAX_BYTES}
            />

            {coordinates[0] ? (
              <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                <MapPin className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>
                  GPS stamped:{" "}
                  <strong className="font-mono">
                    {coordinates[0].latitude.toFixed(4)}, {coordinates[0].longitude.toFixed(4)}
                  </strong>
                </span>
              </div>
            ) : (
              <div className={`${noticeMuted} flex items-center gap-2`}>
                <MapPin className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>GPS coordinates and timestamp are automatically stamped on captured photos.</span>
              </div>
            )}

            <div className={`${healthPanel} hidden space-y-3 p-4 lg:block`}>
              <h3 className={`${healthHeading} border-b border-slate-100 pb-2`}>
                <ClipboardList aria-hidden="true" />
                Health check summary
              </h3>
              <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">Selected horse</dt>
                  <dd className="m-0 truncate font-medium text-slate-800">{selectedHorseName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Check type</dt>
                  <dd className="m-0 font-medium text-slate-800">{humanize(logType)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Health status</dt>
                  <dd className={cn("m-0 font-medium", healthStatus === "NORMAL" ? "text-emerald-700" : "text-amber-700")}>
                    {HEALTH_STATUS_LABELS[healthStatus]}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Photos attached</dt>
                  <dd className="m-0 font-medium text-slate-800">
                    {files.length} {files.length === 1 ? "photo" : "photos"}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                {/* Shown next to the buttons that triggered it: at the top of the page it was out of sight. */}
                {error && (
                  <p className={`${noticeError} m-0 text-xs`} role="alert">
                    {error}
                  </p>
                )}
                <Button type="button" disabled={isSubmitting} onClick={() => void save()} className="w-full rounded-xs">
                  <Save aria-hidden="true" />
                  {isSubmitting ? "Saving…" : "Save health log"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => void markAllNormal()}
                  className="w-full rounded-xs"
                >
                  <CheckCheck aria-hidden="true" />
                  Mark all normal
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile fixed bottom action bar */}
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-[rgb(203_196_184/0.65)] bg-white px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden">
          {error && (
            <p className={`${noticeError} mx-auto mb-2 max-w-2xl text-xs`} role="alert">
              {error}
            </p>
          )}
          <div className="mx-auto flex max-w-2xl gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => void markAllNormal()}
              className="h-11 flex-1 rounded-xs"
            >
              <CheckCheck aria-hidden="true" />
              Mark all normal
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={() => void save()} className="h-11 flex-1 rounded-xs">
              <Save aria-hidden="true" />
              {isSubmitting ? "Saving…" : "Save health log"}
            </Button>
          </div>
        </div>
      </div>
    </CrewShell>
  )
}
