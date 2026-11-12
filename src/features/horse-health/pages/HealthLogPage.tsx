import { crewTurnErrorMessage } from "@/shared/constants/crew-turn"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Activity, CheckCheck, ClipboardList, MapPin, NotebookPen, Save } from "lucide-react"

import { normalizeRole } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { cn } from "@/lib/utils"
import { UPLOAD_MAX_BYTES } from "@/shared/constants/upload"

import { CrewShell } from "../components/CrewShell"
import { fieldControl, fieldLabel, fieldTextarea, healthHeading, healthPanel, noticeError, noticeMuted } from "../components/health-ui"
import { HEALTH_STATUSES, HEALTH_STATUS_LABELS, HORSE_HEALTH_ROUTES, HYDRATION_STATUSES, LOG_TYPES } from "../constants"
import { useCreateHealthLog, useHorseHealthOverview, useMarkAllNormal } from "../hooks/useHorseHealth"
import type { HealthLogInput, LogType } from "../types"

const sectionClass = `${healthPanel} space-y-3 p-4`
const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")

function toNumber(value: string) {
  return value.trim() ? Number(value) : undefined
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
          Unable to load horse context. {overview.error ? String(overview.error) : "Please try again."}
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
    if (!horseId) {
      setError("Horse is required.")
      return
    }
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
      setError(crewTurnErrorMessage(cause) ?? (cause instanceof Error ? cause.message : "Unable to save health log."))
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
    try {
      await markAllMutation.mutateAsync({
        logType,
        checkedAt: new Date().toISOString(),
        locationDescription: locationDescription || undefined,
        generalNote: generalNote || undefined,
        photoPublicIds: uploadedPublicIds,
        latitude: coordinates[0]?.latitude,
        longitude: coordinates[0]?.longitude,
      })
      toast.success("All horses marked normal.")
      navigate(HORSE_HEALTH_ROUTES.health(transportId))
    } catch (cause) {
      setError(crewTurnErrorMessage(cause) ?? (cause instanceof Error ? cause.message : "Unable to mark all horses normal."))
    }
  }

  const selectClass = `${fieldControl} justify-between`
  const selectedHorseName = horses.find((h) => h.horse.horseId === horseId)?.horse.horseName ?? "Select horse"

  return (
    <CrewShell>
      <div className="mx-auto max-w-2xl space-y-4 pb-28 lg:max-w-6xl lg:pb-12 xl:max-w-7xl">
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

        {error && (
          <p className={noticeError} role="alert">
            {error}
          </p>
        )}

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
                <Select value={horseId} onValueChange={setHorseId}>
                  <SelectTrigger className={selectClass}>
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
                    onChange={(event) => setTemperature(event.target.value)}
                    className={fieldControl}
                  />
                </label>
                <label className={fieldLabel}>
                  Heart rate (bpm)
                  <input
                    inputMode="numeric"
                    placeholder="e.g. 36"
                    value={heartRate}
                    onChange={(event) => setHeartRate(event.target.value)}
                    className={fieldControl}
                  />
                </label>
                <label className={fieldLabel}>
                  Respiratory rate (bpm)
                  <input
                    inputMode="numeric"
                    placeholder="e.g. 12"
                    value={respiratoryRate}
                    onChange={(event) => setRespiratoryRate(event.target.value)}
                    className={fieldControl}
                  />
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
              <textarea
                value={generalNote}
                onChange={(event) => setGeneralNote(event.target.value)}
                placeholder="General note"
                className={`${fieldTextarea} min-h-24`}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <textarea
                  value={behaviorNote}
                  onChange={(event) => setBehaviorNote(event.target.value)}
                  placeholder="Behavior note (optional)"
                  className={fieldTextarea}
                />
                <textarea
                  value={feedingNote}
                  onChange={(event) => setFeedingNote(event.target.value)}
                  placeholder="Feeding note (optional)"
                  className={fieldTextarea}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <textarea
                  value={hydrationNote}
                  onChange={(event) => setHydrationNote(event.target.value)}
                  placeholder="Hydration note (optional)"
                  className={fieldTextarea}
                />
                <textarea
                  value={symptomNote}
                  onChange={(event) => setSymptomNote(event.target.value)}
                  placeholder="Symptom note (optional)"
                  className={fieldTextarea}
                />
              </div>
              <textarea
                value={injuryNote}
                onChange={(event) => setInjuryNote(event.target.value)}
                placeholder="Injury note (optional)"
                className={fieldTextarea}
              />
              <input
                value={locationDescription}
                onChange={(event) => setLocationDescription(event.target.value)}
                maxLength={500}
                placeholder="Location description (optional)"
                className={fieldControl}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={treatment}
                  onChange={(event) => setTreatment(event.target.value)}
                  placeholder="Treatment provided (optional)"
                  className={fieldControl}
                />
                <input
                  value={medication}
                  onChange={(event) => setMedication(event.target.value)}
                  placeholder="Medication given (optional)"
                  className={fieldControl}
                />
              </div>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={veterinarianRequired}
                  onChange={(event) => setVeterinarianRequired(event.target.checked)}
                  className="size-4 accent-primary"
                />
                Veterinarian required
              </label>
              {veterinarianRequired && (
                <textarea
                  value={veterinarianNote}
                  onChange={(event) => setVeterinarianNote(event.target.value)}
                  placeholder="Veterinarian note"
                  className={`${fieldTextarea} min-h-24`}
                />
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
