import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { useAuthStore } from "@/features/auth/store"
import { normalizeRole } from "@/features/auth/access-control"
import { PageHeader } from "@/shared/components/PageHeader"
import { LoadingState } from "@/shared/components/common"
import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"

import { CrewShell } from "../components/CrewShell"
import { HORSE_HEALTH_ROUTES, HYDRATION_STATUSES, LOG_TYPES, HEALTH_STATUSES } from "../constants"
import { useCreateHealthLog, useHorseHealthOverview, useMarkAllNormal } from "../hooks/useHorseHealth"
import type { HealthLogInput, LogType } from "../types"

const inputClass = "min-h-12 w-full border border-slate-300 bg-white px-3 text-base text-[#181818] outline-none focus:border-[#f39200]"
const sectionClass = "space-y-3 border border-slate-300 bg-white p-4"

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
  const horses = overview.data?.horses ?? []
  const [horseId, setHorseId] = useState("")
  const [logType, setLogType] = useState<LogType>("ROUTINE_CHECK")
  const [healthStatus, setHealthStatus] = useState<HealthLogInput["healthStatus"]>("NORMAL")
  const [hydrationStatus, setHydrationStatus] = useState<HealthLogInput["hydrationStatus"]>("NORMAL")
  const [temperature, setTemperature] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [respiratoryRate, setRespiratoryRate] = useState("")
  const [generalNote, setGeneralNote] = useState("")
  const [treatment, setTreatment] = useState("")
  const [medication, setMedication] = useState("")
  const [veterinarianRequired, setVeterinarianRequired] = useState(false)
  const [veterinarianNote, setVeterinarianNote] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [capturedAt, setCapturedAt] = useState<(Date | null)[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  const [gpsMessage, setGpsMessage] = useState("Requesting location…")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!horseId && horses[0]) setHorseId(horses[0].horse.horseId)
  }, [horseId, horses])

  useEffect(() => {
    if (!navigator.geolocation) { setGpsMessage("Location unavailable; you can still save."); return }
    navigator.geolocation.getCurrentPosition(
      (position) => { setGps({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setGpsMessage("Location attached") },
      () => setGpsMessage("Location permission denied; you can still save."),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  if (!isEscort) return <CrewShell><div className="mx-auto max-w-3xl border border-slate-300 bg-white p-6 text-sm text-[#181818]">Only an Escort can record horse health. <Link className="font-semibold text-[#f39200]" to={HORSE_HEALTH_ROUTES.health(transportId)}>Back to health overview</Link></div></CrewShell>
  if (overview.isPending) return <CrewShell><div className="mx-auto max-w-3xl"><LoadingState /></div></CrewShell>
  if (overview.error || !overview.data) return <CrewShell><div className="mx-auto max-w-3xl border border-red-600 bg-red-50 p-4 text-sm text-red-600">Unable to load horse context. {overview.error instanceof Error ? overview.error.message : "Please try again."}</div></CrewShell>

  const isSubmitting = createMutation.isPending || markAllMutation.isPending
  const buildInput = (): HealthLogInput => ({ horseId, logType, healthStatus, hydrationStatus, checkedAt: new Date().toISOString(), temperatureCelsius: toNumber(temperature), heartRateBpm: toNumber(heartRate), respiratoryRateBpm: toNumber(respiratoryRate), generalNote: generalNote || undefined, treatmentProvided: treatment || undefined, medicationGiven: medication || undefined, veterinarianRequired, veterinarianNote: veterinarianRequired ? veterinarianNote || undefined : undefined, files, photoCaptions: captions, photoCapturedAts: capturedAt.flatMap((value) => value ? [value.toISOString()] : []), latitude: gps?.latitude, longitude: gps?.longitude })
  const save = async () => {
    setError(null)
    if (!horseId) { setError("Horse is required."); return }
    try { await createMutation.mutateAsync(buildInput()); toast.success("Health log saved."); navigate(HORSE_HEALTH_ROUTES.health(transportId)) } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save health log.") }
  }
  const markAllNormal = async () => {
    if (!window.confirm("Mark all horses as normal?")) return
    setError(null)
    try { await markAllMutation.mutateAsync({ logType, checkedAt: new Date().toISOString(), generalNote: generalNote || undefined, files, latitude: gps?.latitude, longitude: gps?.longitude }); toast.success("All horses marked normal."); navigate(HORSE_HEALTH_ROUTES.health(transportId)) } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to mark all horses normal.") }
  }

  return <CrewShell><div className="mx-auto max-w-3xl space-y-4 pb-28">
    <PageHeader title="RECORD HORSE HEALTH" backHref={HORSE_HEALTH_ROUTES.health(transportId)} backLabel="Health overview" />
    <div className="border border-slate-300 bg-white p-4 text-sm"><p className="font-semibold text-[#181818]">{overview.data.transportId}</p><p className="mt-1 text-slate-600">{overview.data.horses.length} horses · {overview.data.transportStatus.replace("_", " ")}</p></div>
    {error && <p className="border border-red-600 bg-red-50 p-3 text-sm text-red-600" role="alert">{error}</p>}
    <section className={sectionClass}><label className="block text-sm font-semibold text-[#181818]">Horse<select value={horseId} onChange={(event) => setHorseId(event.target.value)} className={`mt-1 ${inputClass}`}><option value="">Select horse</option>{horses.map((item) => <option key={item.horse.horseId} value={item.horse.horseId}>{item.horse.horseName}</option>)}</select></label><label className="block text-sm font-semibold text-[#181818]">Log type<select value={logType} onChange={(event) => setLogType(event.target.value as LogType)} className={`mt-1 ${inputClass}`}>{LOG_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-[#181818]">Health status<select value={healthStatus} onChange={(event) => setHealthStatus(event.target.value as HealthLogInput["healthStatus"])} className={`mt-1 ${inputClass}`}>{HEALTH_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="text-sm font-semibold text-[#181818]">Hydration status<select value={hydrationStatus} onChange={(event) => setHydrationStatus(event.target.value as HealthLogInput["hydrationStatus"])} className={`mt-1 ${inputClass}`}>{HYDRATION_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label></div></section>
    <section className={sectionClass}><h2 className="text-sm font-bold uppercase tracking-wide text-[#181818]">Vitals</h2><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm text-[#181818]">Temperature °C<input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} className={`mt-1 ${inputClass}`} /></label><label className="text-sm text-[#181818]">Heart rate<input inputMode="numeric" value={heartRate} onChange={(event) => setHeartRate(event.target.value)} className={`mt-1 ${inputClass}`} /></label><label className="text-sm text-[#181818]">Respiratory rate<input inputMode="numeric" value={respiratoryRate} onChange={(event) => setRespiratoryRate(event.target.value)} className={`mt-1 ${inputClass}`} /></label></div><p className="text-xs text-slate-500">Normal hints: 37.5–38.5 °C · 28–44 bpm · 8–16 bpm. Values outside the hint are allowed.</p></section>
    <section className={sectionClass}><h2 className="text-sm font-bold uppercase tracking-wide text-[#181818]">Notes</h2><textarea value={generalNote} onChange={(event) => setGeneralNote(event.target.value)} placeholder="General note" className={`${inputClass} min-h-24 py-3`} /><input value={treatment} onChange={(event) => setTreatment(event.target.value)} placeholder="Treatment provided (optional)" className={inputClass} /><input value={medication} onChange={(event) => setMedication(event.target.value)} placeholder="Medication given (optional)" className={inputClass} /><label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-[#181818]"><input type="checkbox" checked={veterinarianRequired} onChange={(event) => setVeterinarianRequired(event.target.checked)} className="size-5 accent-[#f39200]" />Veterinarian required</label>{veterinarianRequired && <textarea value={veterinarianNote} onChange={(event) => setVeterinarianNote(event.target.value)} placeholder="Veterinarian note" className={`${inputClass} min-h-24 py-3`} />}</section>
    <PhotoCaptureSection files={files} capturedAt={capturedAt} captions={captions} onFilesChange={setFiles} onCapturedAtChange={setCapturedAt} onCaptionsChange={setCaptions} documentLabel="Health check photo" />
    <p className="border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-[#181818]">{gpsMessage}</p>
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-300 bg-white p-3"><div className="mx-auto flex max-w-3xl gap-2"><button type="button" disabled={isSubmitting} onClick={() => void markAllNormal()} className="min-h-12 flex-1 bg-slate-200 px-3 text-sm font-bold text-[#181818] disabled:opacity-50">Mark all normal</button><button type="button" disabled={isSubmitting} onClick={() => void save()} className="min-h-14 flex-1 bg-[#f39200] px-3 text-sm font-bold text-[#181818] disabled:opacity-50">{isSubmitting ? "Saving…" : "Save health log"}</button></div></div>
  </div></CrewShell>
}
