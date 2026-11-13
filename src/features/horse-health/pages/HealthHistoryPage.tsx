import { useState, type ReactNode } from "react"
import { useSearchParams, useParams, useLocation } from "react-router-dom"
import { toast } from "sonner"
import {
  Activity,
  Droplets,
  FileClock,
  HeartPulse,
  Image as ImageIcon,
  ListFilter,
  MapPin,
  NotebookPen,
  Stethoscope,
  Thermometer,
  Upload,
  UserRound,
  Wind,
  X,
} from "lucide-react"

import { normalizeRole } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { UPLOAD_MAX_BYTES } from "@/shared/constants/upload"
import { formatUtcDateTime } from "@/shared/utils/datetime"

import { HealthStatusBadge } from "../components/HealthStatusBadge"
import { healthHeading, healthPanel, noticeError } from "../components/health-ui"
import { HEALTH_STATUS_LABELS, HEALTH_STATUSES, HORSE_HEALTH_ROUTES, LOG_TYPES } from "../constants"
import { healthErrorMessage } from "../errors"
import { useAddHealthLogPhotos, useHealthLogDetail, useHealthLogHistory, useHorseHealthOverview } from "../hooks/useHorseHealth"
import type { LogType } from "../types"

/** The BE maximum page size for the history (ListRequestValidator: 1–100). */
const HISTORY_PAGE_SIZE = 100

// Compact filter chips: 32px, xs text, as wide as their value instead of a full-width labelled field.
const filterTrigger =
  "w-auto min-w-36 gap-1.5 rounded-xs border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-xs"
const humanize = (value: string | null | undefined) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ") : "—"

function formatDate(value: string | null | undefined) {
  return formatUtcDateTime(value)
}

function AddHealthLogPhotos({ transportId, logId, existingPhotoCount }: { transportId: string; logId: string; existingPhotoCount: number }) {
  const mutation = useAddHealthLogPhotos(transportId, logId)
  const [files, setFiles] = useState<File[]>([])
  const [capturedAt, setCapturedAt] = useState<(Date | null)[]>([])
  const [coordinates, setCoordinates] = useState<({ latitude: number; longitude: number } | null)[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [uploadedPublicIds, setUploadedPublicIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const maxFiles = Math.max(0, 5 - existingPhotoCount)
  const submit = async () => {
    if (!files.length) { setError("Select at least one image."); return }
    try {
      if (uploadedPublicIds.length !== files.length) { setError("Please wait until every image is verified."); return }
      await mutation.mutateAsync({
        files,
        photoPublicIds: uploadedPublicIds,
        caption: captions[0] || undefined,
        capturedAt: capturedAt[0]?.toISOString(),
        latitude: coordinates[0]?.latitude,
        longitude: coordinates[0]?.longitude,
      })
      setFiles([]); setCapturedAt([]); setCoordinates([]); setCaptions([]); setUploadedPublicIds([]); setError(null); toast.success("Additional health photos uploaded.")
    } catch (cause) { setError(healthErrorMessage(cause, "Unable to upload additional photos.")) }
  }
  if (maxFiles === 0) return null
  return (
    <section className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className={healthHeading}>
        <Upload aria-hidden="true" />
        Add photo / field note
      </h3>
      <PhotoCaptureSection files={files} maxFiles={maxFiles} maxFileSizeBytes={UPLOAD_MAX_BYTES} capturedAt={capturedAt} coordinates={coordinates} onCoordinatesChange={setCoordinates} captions={captions} onFilesChange={setFiles} onCapturedAtChange={setCapturedAt} onCaptionsChange={setCaptions} onUploadedPublicIdsChange={setUploadedPublicIds} error={error} onError={setError} presignedEntity="attachment" documentLabel="Additional field photo" />
      <Button type="button" disabled={mutation.isPending || !files.length} onClick={() => void submit()} className="rounded-xs">
        <Upload aria-hidden="true" />
        {mutation.isPending ? "Uploading…" : "Upload additional photos"}
      </Button>
    </section>
  )
}

/** A small labelled value with an icon, used for the vitals and the people/place of a check. */
function Vital({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xs border border-slate-100 bg-slate-50/70 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Icon className="size-3.5 text-slate-400" aria-hidden="true" />
        {label}
      </dt>
      <dd className="m-0 mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  )
}

export default function HealthHistoryPage() {
  const { transportId = "", horseId = "", bookingId = "" } = useParams<{ transportId: string; horseId: string; bookingId: string }>()
  const location = useLocation()
  const healthHref = location.pathname.startsWith("/admin/")
    ? `/admin/ongoing-transports/${encodeURIComponent(transportId)}/health`
    : location.pathname.startsWith("/bookings/")
      ? `/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(transportId)}/health`
      : HORSE_HEALTH_ROUTES.health(transportId)
  const principal = useAuthStore((state) => state.principal)
  const isEscort = principal?.roles.some((role) => normalizeRole(role) === "ESCORT") ?? false
  const [searchParams, setSearchParams] = useSearchParams()
  const [logType, setLogType] = useState("")
  const [healthStatus, setHealthStatus] = useState("")
  const overview = useHorseHealthOverview(transportId)
  // No pagination: one page of the BE maximum, newest first, which covers a trip's checks for one horse.
  const history = useHealthLogHistory(transportId, horseId, { logType: logType ? logType as LogType : undefined, healthStatus: healthStatus === "ABNORMAL" ? "OBSERVATION_REQUIRED,AT_RISK,CRITICAL" : healthStatus || undefined, pageIndex: 0, pageSize: HISTORY_PAGE_SIZE })
  const selectedLogId = searchParams.get("logId")
  const detail = useHealthLogDetail(selectedLogId)
  const horse = overview.data?.horses.find((item) => item.horse.horseId === horseId)?.horse ?? history.data?.horse
  const rows = history.data?.items ?? []

  const hiddenCount = Math.max(0, (history.data?.totalItems ?? 0) - rows.length)
  const closeDetail = () => { const next = new URLSearchParams(searchParams); next.delete("logId"); setSearchParams(next) }
  const log = detail.data

  return (
    <div className="space-y-3">
      <PageHeader title="Check history" size="compact" backHref={healthHref} backLabel="Health overview" />

      {/* One row: the horse on the left, compact filters and the count on the right (wraps on phones). */}
      <section className={`${healthPanel} flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3`}>
        <div className="min-w-0">
          <h2 className={healthHeading}>
            <HeartPulse aria-hidden="true" />
            {horse?.horseName ?? "Horse"}
          </h2>
          <p className="m-0 mt-0.5 text-[11px] text-slate-500">
            Microchip {horse?.microchipNumber ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={logType || "ALL"} onValueChange={(value) => { setLogType(value === "ALL" ? "" : value) }}>
            <SelectTrigger size="sm" aria-label="Filter by log type" className={filterTrigger}>
              <ListFilter aria-hidden="true" className="size-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All log types</SelectItem>
              {LOG_TYPES.map((value) => <SelectItem key={value} value={value}>{humanize(value)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={healthStatus || "ALL"} onValueChange={(value) => { setHealthStatus(value === "ALL" ? "" : value) }}>
            <SelectTrigger size="sm" aria-label="Filter by health status" className={filterTrigger}>
              <HeartPulse aria-hidden="true" className="size-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ABNORMAL">Only abnormal</SelectItem>
              {HEALTH_STATUSES.map((value) => <SelectItem key={value} value={value}>{HEALTH_STATUS_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          {history.data ? (
            <span className="rounded-xs border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 tabular-nums">
              {history.data.totalItems} {history.data.totalItems === 1 ? "check" : "checks"}
            </span>
          ) : null}
        </div>
      </section>

      {history.isPending ? (
        <LoadingState />
      ) : history.error && !history.data ? (
        <p className={noticeError}>{healthErrorMessage(history.error, "Unable to load check history.")}</p>
      ) : (
        <>
          <ul className="m-0 list-none space-y-2 p-0">
            {rows.map((row) => (
              <li key={row.horseHealthLogId}>
                <button
                  type="button"
                  onClick={() => setSearchParams({ logId: row.horseHealthLogId })}
                  className={`${healthPanel} block w-full cursor-pointer px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-slate-900">{humanize(row.logType)}</p>
                      <p className="m-0 mt-0.5 text-[11px] text-slate-500 tabular-nums">{formatDate(row.checkedAt)}</p>
                    </div>
                    <HealthStatusBadge status={row.healthStatus} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Droplets className="size-3.5 text-slate-400" aria-hidden="true" />Hydration: {humanize(row.hydrationStatus)}</span>
                    <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5 text-slate-400" aria-hidden="true" />{row.checkedBy.fullName}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <ImageIcon className={`size-3.5 ${row.hasPhoto ? "text-primary" : "text-slate-400"}`} aria-hidden="true" />
                      {row.hasPhoto ? "Photo attached" : "No photo"}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <div className={`${healthPanel} flex flex-col items-center gap-1.5 px-4 py-8 text-center`}>
              <FileClock className="size-5 text-slate-400" aria-hidden="true" />
              <p className="m-0 text-xs text-slate-500">No health checks found for these filters.</p>
            </div>
          )}
          {/* Never hide checks silently: say so if a horse has more than one page of them. */}
          {hiddenCount > 0 && (
            <p className="m-0 rounded-xs border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Showing the latest {rows.length} of {history.data?.totalItems} checks. Use the filters to narrow the list.
            </p>
          )}
          {rows.length > 0 && (
            <p className="m-0 text-[11px] text-slate-500">Select a check to view all of its details.</p>
          )}
        </>
      )}

      {selectedLogId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={closeDetail}>
          <aside
            className={`${healthPanel} max-h-[90vh] w-full overflow-y-auto rounded-b-none sm:max-w-3xl sm:rounded-xs`}
            role="dialog"
            aria-modal="true"
            aria-label="Health check detail"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
              <h2 className={healthHeading}>
                <FileClock aria-hidden="true" />
                Check detail
              </h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={closeDetail} aria-label="Close detail" className="rounded-xs">
                <X aria-hidden="true" />
              </Button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-5">
              {detail.isPending ? (
                <LoadingState />
              ) : detail.error || !log ? (
                <p className={noticeError}>{detail.error ? healthErrorMessage(detail.error, "Unable to load check detail.") : "Unable to load check detail."}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-base font-semibold text-slate-900">{log.horse.horseName}</p>
                      <p className="m-0 mt-0.5 text-xs text-slate-500 tabular-nums">{formatDate(log.checkedAt)} · {humanize(log.logType)}</p>
                    </div>
                    <HealthStatusBadge status={log.healthStatus} />
                  </div>

                  <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Vital icon={Thermometer} label="Temperature" value={log.temperatureCelsius == null ? "—" : `${log.temperatureCelsius} °C`} />
                    <Vital icon={Activity} label="Heart rate" value={log.heartRateBpm == null ? "—" : `${log.heartRateBpm} bpm`} />
                    <Vital icon={Wind} label="Respiratory rate" value={log.respiratoryRateBpm == null ? "—" : `${log.respiratoryRateBpm} bpm`} />
                    <Vital icon={Droplets} label="Hydration" value={humanize(log.hydrationStatus)} />
                    <Vital icon={UserRound} label="Checked by" value={log.checkedBy.fullName} />
                    <Vital icon={Stethoscope} label="Veterinarian" value={log.veterinarianRequired ? "Required" : "Not required"} />
                  </dl>

                  <section className="space-y-2">
                    <h3 className={healthHeading}>
                      <NotebookPen aria-hidden="true" />
                      Notes
                    </h3>
                    <dl className="m-0 divide-y divide-slate-100 rounded-xs border border-slate-100">
                      {(
                        [
                          ["Location", log.locationDescription],
                          ["General note", log.generalNote],
                          ["Behavior", log.behaviorNote],
                          ["Feeding", log.feedingNote],
                          ["Hydration", log.hydrationNote],
                          ["Symptoms", log.symptomNote],
                          ["Injury", log.injuryNote],
                          ["Treatment", log.treatmentProvided],
                          ["Medication", log.medicationGiven],
                          ...(log.veterinarianRequired ? [["Veterinarian note", log.veterinarianNote]] : []),
                        ] as Array<[string, string | null | undefined]>
                      ).map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 px-3 py-2 text-xs">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="m-0 break-words whitespace-pre-wrap text-slate-800">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  {log.photos.length > 0 && (
                    <section className="space-y-2">
                      <h3 className={healthHeading}>
                        <ImageIcon aria-hidden="true" />
                        Photos
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {log.photos.map((photo) => (
                          <figure key={photo.photoUrl} className="m-0 space-y-1">
                            <div className="overflow-hidden rounded-xs border border-slate-200">
                              <ImageViewer images={[{ src: photo.photoUrl, title: "Health check photo", alt: "Health check photo" }]} height={220} width="100%" />
                            </div>
                            {photo.caption ? <figcaption className="text-xs text-slate-600">{photo.caption}</figcaption> : null}
                            {photo.latitude !== null && photo.longitude !== null && (
                              <p className="m-0 flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="size-3 text-slate-400" aria-hidden="true" />
                                <span className="font-mono">{photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</span>
                              </p>
                            )}
                          </figure>
                        ))}
                      </div>
                    </section>
                  )}

                  {isEscort && <AddHealthLogPhotos transportId={transportId} logId={log.horseHealthLogId} existingPhotoCount={log.photos.length} />}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
