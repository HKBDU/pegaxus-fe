import { useState } from "react"
import { useSearchParams, useParams, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { Image as ImageIcon, X } from "lucide-react"

import { normalizeRole } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { TablePagination } from "@/shared/components/common"
import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { formatUtcDateTime } from "@/shared/utils/datetime"

import { HEALTH_STATUS_LABELS, HEALTH_STATUSES, HORSE_HEALTH_ROUTES, LOG_TYPES } from "../constants"
import { useAddHealthLogPhotos, useHealthLogDetail, useHealthLogHistory, useHorseHealthOverview } from "../hooks/useHorseHealth"
import type { HealthLogSummary, LogType } from "../types"

const selectClass = "min-h-12 w-full border border-slate-300 bg-white px-3 text-sm text-[#181818] outline-none focus:border-[#f39200]"

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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload additional photos.") }
  }
  if (maxFiles === 0) return null
  return <div className="mt-5 space-y-3 border-t border-slate-300 pt-4"><p className="font-bold text-[#181818]">Add photo / field note</p><PhotoCaptureSection files={files} maxFiles={maxFiles} capturedAt={capturedAt} coordinates={coordinates} onCoordinatesChange={setCoordinates} captions={captions} onFilesChange={setFiles} onCapturedAtChange={setCapturedAt} onCaptionsChange={setCaptions} onUploadedPublicIdsChange={setUploadedPublicIds} error={error} onError={setError} presignedEntity="attachment" documentLabel="Additional field photo" /><button type="button" disabled={mutation.isPending || !files.length} onClick={() => void submit()} className="min-h-12 bg-[#f39200] px-4 text-sm font-bold text-[#181818] disabled:opacity-50">{mutation.isPending ? "Uploading…" : "Upload additional photos"}</button></div>
}

function formatDate(value: string | null | undefined) {
  return formatUtcDateTime(value)
}

function statusClass(status: HealthLogSummary["healthStatus"]) {
  if (status === "CRITICAL") return "text-red-600"
  if (status === "NORMAL") return "text-[#181818]"
  return "text-[#f39200]"
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
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const overview = useHorseHealthOverview(transportId)
  const history = useHealthLogHistory(transportId, horseId, { logType: logType ? logType as LogType : undefined, healthStatus: healthStatus === "ABNORMAL" ? "OBSERVATION_REQUIRED,AT_RISK,CRITICAL" : healthStatus || undefined, pageIndex, pageSize })
  const selectedLogId = searchParams.get("logId")
  const detail = useHealthLogDetail(selectedLogId)
  const horse = overview.data?.horses.find((item) => item.horse.horseId === horseId)?.horse ?? history.data?.horse
  const rows = history.data?.items ?? []

  const meta = history.data ? { totalItems: history.data.totalItems, totalPages: history.data.totalPages, itemsPerPage: history.data.pageSize, currentPage: history.data.pageIndex + 1, hasPreviousPage: history.data.pageIndex > 0, hasNextPage: history.data.pageIndex + 1 < history.data.totalPages } : { totalItems: 0, totalPages: 0, itemsPerPage: pageSize, currentPage: 1, hasPreviousPage: false, hasNextPage: false }
  const closeDetail = () => { const next = new URLSearchParams(searchParams); next.delete("logId"); setSearchParams(next) }

  return <div className="space-y-4">
    <PageHeader title="CHECK HISTORY" backHref={healthHref} backLabel="Health overview" />
    <div className="border border-slate-300 bg-white p-4"><p className="text-xs text-slate-500">Horse</p><p className="font-bold text-[#181818]">{horse?.horseName ?? horseId}</p><p className="text-xs text-slate-500">{horse?.microchipNumber ?? "—"}</p></div>
    <div className="grid gap-3 border border-slate-300 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-semibold text-[#181818]">Log type<Select value={logType || "ALL"} onValueChange={(value) => { setLogType(value === "ALL" ? "" : value); setPageIndex(0) }}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All log types</SelectItem>{LOG_TYPES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></label><label className="text-sm font-semibold text-[#181818]">Health status<Select value={healthStatus || "ALL"} onValueChange={(value) => { setHealthStatus(value === "ALL" ? "" : value); setPageIndex(0) }}><SelectTrigger className={selectClass}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ABNORMAL">Only abnormal</SelectItem>{HEALTH_STATUSES.map((value) => <SelectItem key={value} value={value}>{HEALTH_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select></label></div>
    {history.isPending ? <LoadingState /> : history.error && !history.data ? <p className="border border-red-600 bg-red-50 p-4 text-sm text-red-600">Unable to load check history.</p> : <><div className="space-y-3">{rows.map((row) => <button key={row.horseHealthLogId} type="button" onClick={() => setSearchParams({ logId: row.horseHealthLogId })} className="block min-h-32 w-full border border-slate-300 bg-white p-4 text-left transition-colors hover:border-[#f39200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f39200]"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{formatDate(row.checkedAt)}</p><p className="mt-1 font-bold text-[#181818]">{row.logType.replaceAll("_", " ")}</p></div><span className={`font-bold ${statusClass(row.healthStatus)}`}>{HEALTH_STATUS_LABELS[row.healthStatus]}</span></div><div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3"><span>Hydration: {row.hydrationStatus?.replaceAll("_", " ") ?? "—"}</span><span>Checked by: {row.checkedBy.fullName}</span><span className="inline-flex items-center gap-1">{row.hasPhoto && <ImageIcon className="size-4 text-[#f39200]" />} {row.hasPhoto ? "Photo attached" : "No photo"}</span></div></button>)}{rows.length === 0 && <div className="border border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No health checks found.</div>}</div><TablePagination meta={meta} onPageChange={(page) => setPageIndex(page - 1)} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0) }} /><p className="text-xs text-slate-500">Select a card to view the complete check.</p></>}
    {selectedLogId && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={closeDetail}><aside className="max-h-[90vh] w-full overflow-y-auto border-t border-slate-300 bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-[2px] sm:border sm:p-6" role="dialog" aria-modal="true" aria-label="Health check detail" onClick={(event) => event.stopPropagation()}><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#181818]">CHECK DETAIL</h2><button type="button" onClick={closeDetail} className="inline-flex size-12 items-center justify-center cursor-pointer" aria-label="Close detail"><X className="size-5" /></button></div>{detail.isPending ? <LoadingState /> : detail.error || !detail.data ? <p className="mt-4 text-sm text-red-600">Unable to load check detail.</p> : <div className="mt-4 space-y-4 text-sm text-[#181818]"><div><p className="font-bold">{detail.data.horse.horseName}</p><p className="text-slate-500">{formatDate(detail.data.checkedAt)} · {detail.data.logType.replaceAll("_", " ")}</p></div><div className="grid gap-3 sm:grid-cols-2"><p>Health: <strong className={statusClass(detail.data.healthStatus)}>{HEALTH_STATUS_LABELS[detail.data.healthStatus]}</strong></p><p>Hydration: <strong>{detail.data.hydrationStatus?.replaceAll("_", " ") ?? "—"}</strong></p><p>Temperature: <strong>{detail.data.temperatureCelsius ?? "—"}</strong></p><p>Heart rate: <strong>{detail.data.heartRateBpm ?? "—"}</strong></p><p>Respiratory rate: <strong>{detail.data.respiratoryRateBpm ?? "—"}</strong></p><p>Checked by: <strong>{detail.data.checkedBy.fullName}</strong></p></div><div className="space-y-2"><p>Location: <strong>{detail.data.locationDescription ?? "—"}</strong></p><p>Behavior: {detail.data.behaviorNote ?? "—"}</p><p>Feeding: {detail.data.feedingNote ?? "—"}</p><p>Hydration: {detail.data.hydrationNote ?? "—"}</p><p>Symptoms: {detail.data.symptomNote ?? "—"}</p><p>Injury: {detail.data.injuryNote ?? "—"}</p><p>Treatment: {detail.data.treatmentProvided ?? "—"}</p><p>Medication: {detail.data.medicationGiven ?? "—"}</p><p>General note: {detail.data.generalNote ?? "—"}</p></div>{detail.data.photos.length > 0 && <div className="space-y-2"><p className="font-bold">Photos</p><div className="grid gap-3 sm:grid-cols-2">{detail.data.photos.map((photo) => <div key={photo.photoUrl} className="space-y-1"><ImageViewer images={[{ src: photo.photoUrl, title: "Health check photo", alt: "Health check photo" }]} height={240} width="100%" />{photo.latitude !== null && photo.longitude !== null && <p className="text-[11px] font-mono text-slate-500">📍 GPS: {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</p>}</div>)}</div></div>}{isEscort && <AddHealthLogPhotos transportId={transportId} logId={detail.data.horseHealthLogId} existingPhotoCount={detail.data.photos.length} />}</div>}</div></aside></div>}
  </div>
}
