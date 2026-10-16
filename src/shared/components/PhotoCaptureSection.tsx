import { Camera, Clock, FolderOpen, RotateCcw, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"

import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { Button } from "@/shared/components/ui/button"

export interface PhotoCaptureSectionProps {
  files: File[]
  maxFiles?: number
  acceptedTypes?: string[]
  maxFileSizeBytes?: number
  capturedAt: (Date | null)[]
  captions?: string[]
  documentLabel?: string
  statusLabel?: string
  error?: string | null
  onFilesChange: (files: File[]) => void
  onCapturedAtChange: (values: (Date | null)[]) => void
  onCaptionsChange?: (values: string[]) => void
  onError?: (message: string | null) => void
}

const DEFAULT_TYPES = ["image/jpeg", "image/jpg", "image/png"]
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024

function formatTimestamp(value: Date | null | undefined) {
  return value?.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) ?? ""
}

export function PhotoCaptureSection({ files, maxFiles = 1, acceptedTypes = DEFAULT_TYPES, maxFileSizeBytes = DEFAULT_MAX_SIZE, capturedAt, captions = [], documentLabel = "Photographic Proof", statusLabel = "Pending Verification", error, onFilesChange, onCapturedAtChange, onCaptionsChange, onError }: PhotoCaptureSectionProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => () => objectUrls.forEach((url) => URL.revokeObjectURL(url)), [objectUrls])

  const addFiles = (picked: FileList | null) => {
    if (!picked?.length) return
    const nextFiles = [...files]
    const nextDates = [...capturedAt]
    for (const file of Array.from(picked)) {
      if (nextFiles.length >= maxFiles) { onError?.(`You can attach up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`); break }
      if (!acceptedTypes.includes(file.type)) { onError?.("Only JPG, JPEG or PNG images are accepted."); continue }
      if (file.size > maxFileSizeBytes) { onError?.("Image must be 5 MB or smaller."); continue }
      nextFiles.push(file)
      nextDates.push(new Date())
    }
    if (nextFiles.length !== files.length) { onFilesChange(nextFiles); onCapturedAtChange(nextDates); onError?.(null) }
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, current) => current !== index))
    onCapturedAtChange(capturedAt.filter((_, current) => current !== index))
    onCaptionsChange?.(captions.filter((_, current) => current !== index))
  }

  return <section className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{documentLabel}</h2>{files.length > 0 && <span className="text-xs font-semibold text-orange-600">{files.length}/{maxFiles} file{maxFiles === 1 ? "" : "s"}</span>}</div>
    {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}
    <div className="grid grid-cols-2 gap-3"><Button type="button" className="min-h-12 gap-2 bg-orange-600 text-white hover:bg-orange-700" onClick={() => cameraInputRef.current?.click()}><Camera className="size-4" />Take Photo</Button><Button type="button" variant="outline" className="min-h-12 gap-2" onClick={() => galleryInputRef.current?.click()}><FolderOpen className="size-4" />From Gallery</Button></div>
    <input ref={cameraInputRef} type="file" accept={acceptedTypes.join(",")} capture="environment" className="sr-only" aria-label="Take photo with camera" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = "" }} />
    <input ref={galleryInputRef} type="file" accept={acceptedTypes.join(",")} multiple={maxFiles > 1} className="sr-only" aria-label="Select photo from gallery" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = "" }} />
    <div className="grid gap-4 sm:grid-cols-2">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="space-y-3"><div className="relative overflow-hidden border border-slate-200"><div className="absolute left-2 top-2 z-30 flex items-center gap-1.5 bg-black/70 px-2 py-1 text-[11px] text-white"><Clock className="size-3" />{formatTimestamp(capturedAt[index])}</div><div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase text-white"><ShieldCheck className="size-3" />{statusLabel}</div><ImageViewer images={[{ src: objectUrls[index], title: file.name, alt: documentLabel }]} height={260} width="100%" /></div><input value={captions[index] ?? ""} onChange={(event) => onCaptionsChange?.(files.map((_, current) => current === index ? event.target.value : captions[current] ?? ""))} placeholder="Caption (optional)" aria-label={`Caption for ${file.name}`} className="min-h-12 w-full rounded-md border border-slate-200 px-3 text-base outline-none focus:border-orange-500" /><div className="flex gap-5"><button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex min-h-12 items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-orange-600"><RotateCcw className="size-4" />Retake</button><button type="button" onClick={() => removeFile(index)} className="inline-flex min-h-12 items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-600"><Trash2 className="size-4" />Remove</button></div></div>)}</div>
  </section>
}
