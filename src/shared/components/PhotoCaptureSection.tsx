import { Camera, Clock, FolderOpen, MapPin, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { Button } from "@/shared/components/ui/button"
import { isPresignedUploadError, presignedUpload } from "@/shared/utils/presigned"
import { getCurrentGpsCoordinates } from "@/shared/utils/gps"
import { stampPhoto } from "@/shared/utils/photo-stamp"

export interface PhotoCaptureSectionProps {
  files: File[]
  maxFiles?: number
  acceptedTypes?: string[]
  maxFileSizeBytes?: number
  capturedAt: (Date | null)[]
  coordinates?: ({ latitude: number; longitude: number } | null)[]
  captions?: string[]
  documentLabel?: string
  statusLabel?: string
  error?: string | null
  onFilesChange: (files: File[]) => void
  onCapturedAtChange: (values: (Date | null)[]) => void
  onCoordinatesChange?: (values: ({ latitude: number; longitude: number } | null)[]) => void
  onCaptionsChange?: (values: string[]) => void
  onError?: (message: string | null) => void
  presignedEntity?: "attachment"
  onUploadedPublicIdsChange?: (publicIds: string[]) => void
  onUploadStateChange?: (state: "idle" | "uploading" | "ready" | "error") => void
}

const DEFAULT_TYPES = ["image/jpeg", "image/jpg", "image/png"]
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024

function sizeLimitMessage(maxFileSizeBytes: number) {
  return `Only JPG, JPEG, PNG images up to ${Math.round(maxFileSizeBytes / 1024 / 1024)}MB are accepted. Please try again.`
}

function formatTimestamp(value: Date | null | undefined) {
  return value?.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) ?? ""
}

export function PhotoCaptureSection({
  files,
  maxFiles = 1,
  acceptedTypes = DEFAULT_TYPES,
  maxFileSizeBytes = DEFAULT_MAX_SIZE,
  capturedAt,
  coordinates,
  captions = [],
  documentLabel = "Photographic Proof",
  statusLabel = "Pending Verification",
  error,
  onFilesChange,
  onCapturedAtChange,
  onCoordinatesChange,
  onCaptionsChange,
  onError,
  presignedEntity,
  onUploadedPublicIdsChange,
  onUploadStateChange,
}: PhotoCaptureSectionProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const retakeIndexRef = useRef<number | null>(null)
  const uploadGeneration = useRef(0)
  const [uploadStatuses, setUploadStatuses] = useState<("uploading" | "ready" | "error")[]>([])
  const [, setConfirmedPublicIds] = useState<(string | null)[]>([])
  const [localCoordinates, setLocalCoordinates] = useState<({ latitude: number; longitude: number } | null)[]>([])
  const activeCoordinates = coordinates ?? localCoordinates

  const updateCoordinates = (next: ({ latitude: number; longitude: number } | null)[]) => {
    setLocalCoordinates(next)
    onCoordinatesChange?.(next)
  }

  const objectUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => () => objectUrls.forEach((url) => URL.revokeObjectURL(url)), [objectUrls])

  useEffect(() => {
    if (!presignedEntity) return
    const state =
      uploadStatuses.length === 0
        ? "idle"
        : uploadStatuses.includes("error")
          ? "error"
          : uploadStatuses.includes("uploading")
            ? "uploading"
            : "ready"
    onUploadStateChange?.(state)
  }, [onUploadStateChange, presignedEntity, uploadStatuses])

  const uploadSingle = async (file: File, targetIndex: number, generation: number) => {
    if (!presignedEntity) return
    try {
      const publicId = await presignedUpload.upload({ file, entity: presignedEntity })
      if (generation !== uploadGeneration.current) return
      setUploadStatuses((current) => current.map((status, index) => (index === targetIndex ? "ready" : status)))
      setConfirmedPublicIds((current) => {
        const next = [...current]
        next[targetIndex] = publicId
        onUploadedPublicIdsChange?.(next.filter((id): id is string => Boolean(id)))
        return next
      })
    } catch (cause) {
      if (generation !== uploadGeneration.current) return
      setUploadStatuses((current) => current.map((status, index) => (index === targetIndex ? "error" : status)))
      const message = isPresignedUploadError(cause) ? `${cause.code}: ${cause.message}` : "Image upload failed. Please try again."
      onError?.(message)
    }
  }

  const uploadBatch = async (newFiles: File[], startIndex: number) => {
    if (!presignedEntity) return
    const generation = ++uploadGeneration.current
    setUploadStatuses((current) => [
      ...current.slice(0, startIndex),
      ...newFiles.map(() => "uploading" as const),
    ])
    await Promise.all(
      newFiles.map((file, offset) => uploadSingle(file, startIndex + offset, generation)),
    )
  }

  const handleRetake = (index: number) => {
    retakeIndexRef.current = index
    cameraInputRef.current?.click()
  }

  const retryUpload = (index: number) => {
    const file = files[index]
    if (!file || !presignedEntity) return
    const generation = ++uploadGeneration.current
    setUploadStatuses((current) => current.map((status, i) => (i === index ? "uploading" : status)))
    onError?.(null)
    void uploadSingle(file, index, generation)
  }

  const addFiles = async (picked: FileList | null) => {
    if (!picked?.length) {
      retakeIndexRef.current = null
      return
    }

    const retakeIdx = retakeIndexRef.current
    retakeIndexRef.current = null

    // Acquire current GPS coordinates for photo location marking
    const currentGps = await getCurrentGpsCoordinates()

    if (retakeIdx !== null && retakeIdx >= 0 && retakeIdx < files.length) {
      const originalFile = picked[0]
      if (!acceptedTypes.includes(originalFile.type)) {
        onError?.("Only JPG, JPEG or PNG images are accepted.")
        return
      }
      if (originalFile.size > maxFileSizeBytes) {
        onError?.(sizeLimitMessage(maxFileSizeBytes))
        return
      }
      const captureTime = new Date()
      const stampedFile = await stampPhoto(originalFile, {
        capturedAt: captureTime,
        coordinates: currentGps,
        documentLabel,
      })
      if (stampedFile.size > maxFileSizeBytes) {
        onError?.(sizeLimitMessage(maxFileSizeBytes))
        return
      }

      const nextFiles = [...files]
      nextFiles[retakeIdx] = stampedFile
      const nextDates = [...capturedAt]
      nextDates[retakeIdx] = captureTime
      const nextCoords = [...activeCoordinates]
      nextCoords[retakeIdx] = currentGps

      onFilesChange(nextFiles)
      onCapturedAtChange(nextDates)
      updateCoordinates(nextCoords)
      onError?.(null)

      const generation = ++uploadGeneration.current
      setUploadStatuses((current) => current.map((s, i) => (i === retakeIdx ? "uploading" : s)))
      setConfirmedPublicIds((current) => {
        const next = [...current]
        next[retakeIdx] = null
        onUploadedPublicIdsChange?.(next.filter((id): id is string => Boolean(id)))
        return next
      })
      void uploadSingle(stampedFile, retakeIdx, generation)
      return
    }

    const nextFiles = [...files]
    const nextDates = [...capturedAt]
    const nextCoords = [...activeCoordinates]
    const filesToUpload: File[] = []

    for (const originalFile of Array.from(picked)) {
      if (nextFiles.length >= maxFiles) {
        onError?.(`You can attach up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`)
        break
      }
      if (!acceptedTypes.includes(originalFile.type)) {
        onError?.("Only JPG, JPEG or PNG images are accepted.")
        continue
      }
      if (originalFile.size > maxFileSizeBytes) {
        onError?.(sizeLimitMessage(maxFileSizeBytes))
        continue
      }
      const captureTime = new Date()
      const stampedFile = await stampPhoto(originalFile, {
        capturedAt: captureTime,
        coordinates: currentGps,
        documentLabel,
      })
      if (stampedFile.size > maxFileSizeBytes) {
        onError?.(sizeLimitMessage(maxFileSizeBytes))
        continue
      }

      nextFiles.push(stampedFile)
      nextDates.push(captureTime)
      nextCoords.push(currentGps)
      filesToUpload.push(stampedFile)
    }

    if (nextFiles.length !== files.length) {
      onFilesChange(nextFiles)
      onCapturedAtChange(nextDates)
      updateCoordinates(nextCoords)
      onError?.(null)
      void uploadBatch(filesToUpload, files.length)
    }
  }

  const removeFile = (index: number) => {
    uploadGeneration.current += 1
    const nextFiles = files.filter((_, current) => current !== index)
    const nextDates = capturedAt.filter((_, current) => current !== index)
    const nextCaptions = captions.filter((_, current) => current !== index)
    const nextCoords = activeCoordinates.filter((_, current) => current !== index)
    onFilesChange(nextFiles)
    onCapturedAtChange(nextDates)
    updateCoordinates(nextCoords)
    onCaptionsChange?.(nextCaptions)
    setUploadStatuses((current) => current.filter((_, current) => current !== index))
    setConfirmedPublicIds((current) => {
      const next = current.filter((_, currentIdx) => currentIdx !== index)
      onUploadedPublicIdsChange?.(next.filter((publicId): publicId is string => Boolean(publicId)))
      return next
    })
  }

  return (
    <section className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{documentLabel}</h2>
        {files.length > 0 && (
          <span className="text-xs font-semibold text-orange-600">
            {files.length}/{maxFiles} file{maxFiles === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          className="min-h-12 gap-2 bg-orange-600 text-white hover:bg-orange-700"
          onClick={() => {
            retakeIndexRef.current = null
            cameraInputRef.current?.click()
          }}
        >
          <Camera className="size-4" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 gap-2"
          onClick={() => {
            retakeIndexRef.current = null
            galleryInputRef.current?.click()
          }}
        >
          <FolderOpen className="size-4" />
          From Gallery
        </Button>
      </div>
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        capture="environment"
        className="sr-only"
        aria-label="Take photo with camera"
        onChange={(event) => {
          void addFiles(event.target.files)
          event.currentTarget.value = ""
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        multiple={maxFiles > 1}
        className="sr-only"
        aria-label="Select photo from gallery"
        onChange={(event) => {
          void addFiles(event.target.files)
          event.currentTarget.value = ""
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {files.map((file, index) => {
          const coord = activeCoordinates[index]
          return (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="space-y-3">
              <div className="relative overflow-hidden border border-slate-200">
                <div className="absolute left-2 top-2 z-30 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 bg-black/75 px-2 py-1 text-[11px] font-mono text-white shadow-sm">
                    <Clock className="size-3 text-orange-400" />
                    {formatTimestamp(capturedAt[index])}
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/75 px-2 py-1 text-[11px] font-mono text-white shadow-sm">
                    <MapPin className="size-3 text-cyan-400" />
                    {coord ? (
                      <span>{coord.latitude.toFixed(4)}, {coord.longitude.toFixed(4)}</span>
                    ) : (
                      <span className="text-slate-300">GPS Unavailable</span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-white shadow-sm">
                  <ShieldCheck className="size-3 text-orange-400" />
                  {statusLabel}
                </div>
                <ImageViewer images={[{ src: objectUrls[index], title: file.name, alt: documentLabel }]} height={260} width="100%" />
              </div>
              <input
                value={captions[index] ?? ""}
                onChange={(event) =>
                  onCaptionsChange?.(
                    files.map((_, current) => (current === index ? event.target.value : captions[current] ?? "")),
                  )
                }
                placeholder="Caption (optional)"
                aria-label={`Caption for ${file.name}`}
                className="min-h-12 w-full rounded-md border border-slate-200 px-3 text-base outline-none focus:border-orange-500"
              />
              {presignedEntity && (
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs font-medium ${
                      uploadStatuses[index] === "error"
                        ? "text-red-600"
                        : uploadStatuses[index] === "ready"
                          ? "text-green-700"
                          : "text-slate-500"
                    }`}
                  >
                    {uploadStatuses[index] === "ready"
                      ? "Image uploaded"
                      : uploadStatuses[index] === "error"
                        ? "Upload failed"
                        : "Uploading image…"}
                  </p>
                  {uploadStatuses[index] === "error" && (
                    <button
                      type="button"
                      onClick={() => retryUpload(index)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
                    >
                      <RefreshCw className="size-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-5">
                <button
                  type="button"
                  onClick={() => handleRetake(index)}
                  className="inline-flex min-h-12 items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-orange-600"
                >
                  <RotateCcw className="size-4" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="inline-flex min-h-12 items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
