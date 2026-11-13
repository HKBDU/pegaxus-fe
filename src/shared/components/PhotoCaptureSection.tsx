import {
  Camera,
  Clock,
  FolderOpen,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { formatFileSize } from "@/shared/components/file-uploader/utils"
import { UPLOAD_MAX_BYTES } from "@/shared/constants/upload"
import {
  isPresignedUploadError,
  presignedUpload,
} from "@/shared/utils/presigned"
import { getCurrentGpsCoordinates } from "@/shared/utils/gps"
import { stampPhoto } from "@/shared/utils/photo-stamp"
import { formatUtcDateTime } from "@/shared/utils/datetime"

export type PhotoUploadState = "idle" | "uploading" | "ready" | "error"
export type UploadedPhoto = { file: File; publicId: string }
type Coordinates = { latitude: number; longitude: number } | null
type PhotoUpload = {
  file: File
  processed: boolean
  status: "processing" | "uploading" | "ready" | "error"
  publicId: string | null
  error: string | null
  attempt: number
  controller?: AbortController
}

export interface PhotoCaptureSectionProps {
  files: File[]
  maxFiles?: number
  acceptedTypes?: string[]
  maxFileSizeBytes?: number
  capturedAt: (Date | null)[]
  coordinates?: Coordinates[]
  /** Use the transport's shared Driver position instead of this device's GPS. */
  gpsCoordinates?: Coordinates
  useDeviceGps?: boolean
  captions?: string[]
  documentLabel?: string
  statusLabel?: string
  error?: string | null
  onFilesChange: (files: File[]) => void
  onCapturedAtChange: (values: (Date | null)[]) => void
  onCoordinatesChange?: (values: Coordinates[]) => void
  onCaptionsChange?: (values: string[]) => void
  onError?: (message: string | null) => void
  presignedEntity?: "attachment"
  uploadedPublicIds?: string[]
  uploadedPhotos?: UploadedPhoto[]
  onUploadedPhotosChange?: (photos: UploadedPhoto[]) => void
  onUploadedPublicIdsChange?: (publicIds: string[]) => void
  onUploadStateChange?: (state: PhotoUploadState) => void
}

const DEFAULT_TYPES = ["image/jpeg", "image/jpg", "image/png"]

function formatTimestamp(value: Date | null | undefined) {
  return value ? formatUtcDateTime(value) : ""
}

function uploadErrorMessage(error: unknown) {
  if (!isPresignedUploadError(error)) {
    return error instanceof Error
      ? error.message
      : "Unable to process this image. Please try again."
  }
  if (error.status === 401)
    return "Your session has expired. Sign in again before retrying this photo."
  if (error.status === 403)
    return "You do not have permission to upload this photo."
  const messages: Record<string, string> = {
    FILE_TOO_LARGE:
      "The processed photo exceeds the upload limit. Try a smaller JPG or PNG.",
    INVALID_FILE_TYPE:
      "The server could not accept this image. Try another JPG or PNG.",
    INVALID_PUBLIC_ID:
      "This upload could not be verified for your account. Please retry.",
    UPLOAD_NOT_FOUND:
      "The server could not find the uploaded photo. Please retry.",
    FILE_NOT_FOUND_ON_CLOUD:
      "The server could not find the uploaded photo. Please retry.",
    FILE_STORAGE_UNAVAILABLE:
      "Photo storage is temporarily unavailable. Please retry later.",
    FILE_STORAGE_TIMEOUT: "Photo verification timed out. Please retry.",
    TOO_MANY_REQUESTS:
      "Too many upload attempts. Wait a moment before retrying.",
    CLOUDINARY_UPLOAD_FAILED:
      "Unable to send this photo. Check your connection and retry.",
    CLOUDINARY_SIGNATURE_INVALID: "Upload authorization expired. Please retry.",
    PRESIGNED_URL_INVALID:
      "The server returned an invalid upload destination. Please retry later.",
  }
  return (
    messages[error.code] ??
    "Photo upload could not be completed. Your photo has been kept; please retry."
  )
}

export function PhotoCaptureSection(props: PhotoCaptureSectionProps) {
  const {
    files,
    maxFiles = 1,
    acceptedTypes = DEFAULT_TYPES,
    maxFileSizeBytes = UPLOAD_MAX_BYTES,
    capturedAt,
    coordinates,
    gpsCoordinates,
    useDeviceGps = true,
    captions = [],
    documentLabel = "Photographic Proof",
    statusLabel = "Pending Verification",
    error,
    onCaptionsChange,
    presignedEntity,
  } = props
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const retakeFileRef = useRef<File | null>(null)
  const [uploadSnapshot, setUploadSnapshot] = useState(
    () =>
      new Map<File, PhotoUpload>(
        files.map((file, index) => {
          const publicId =
            props.uploadedPhotos?.find((photo) => photo.file === file)
              ?.publicId ??
            (props.uploadedPublicIds?.length === files.length
              ? props.uploadedPublicIds[index]
              : null)
          return [
            file,
            {
              file,
              processed: Boolean(publicId),
              status: publicId ? "ready" : "error",
              publicId: publicId ?? null,
              error: null,
              attempt: 0,
            },
          ]
        }),
      ),
  )
  const uploads = useRef(
    new Map([...uploadSnapshot].map(([file, entry]) => [file, { ...entry }])),
  )
  const processingQueue = useRef<Promise<void>>(Promise.resolve())
  const mounted = useRef(true)
  const callbacks = useRef(props)
  useLayoutEffect(() => {
    callbacks.current = props
  }, [props])
  const [localCoordinates, setLocalCoordinates] = useState<Coordinates[]>([])
  const activeCoordinates = coordinates ?? localCoordinates
  const selection = useRef({
    files,
    capturedAt,
    coordinates: activeCoordinates,
    captions,
  })
  useLayoutEffect(() => {
    selection.current = {
      files,
      capturedAt,
      coordinates: activeCoordinates,
      captions,
    }
  }, [files, capturedAt, activeCoordinates, captions])

  const objectUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  )
  useEffect(
    () => () => objectUrls.forEach((url) => URL.revokeObjectURL(url)),
    [objectUrls],
  )
  useEffect(() => {
    mounted.current = true
    const entries = uploads.current
    const inputs = [cameraInputRef.current, galleryInputRef.current]
    const cancel = () => {
      retakeFileRef.current = null
    }
    for (const input of inputs) input?.addEventListener("cancel", cancel)
    return () => {
      mounted.current = false
      for (const input of inputs) input?.removeEventListener("cancel", cancel)
      for (const entry of entries.values()) {
        entry.controller?.abort()
      }
    }
  }, [])

  const publishUploads = () => {
    if (!mounted.current) return
    const current = callbacks.current
    const entries = selection.current.files.map((file) =>
      uploads.current.get(file),
    )
    setUploadSnapshot(
      new Map(
        [...uploads.current].map(([file, entry]) => [file, { ...entry }]),
      ),
    )
    if (!current.presignedEntity) return
    current.onUploadedPublicIdsChange?.(
      entries.flatMap((entry) =>
        entry?.status === "ready" && entry.publicId ? [entry.publicId] : [],
      ),
    )
    current.onUploadedPhotosChange?.(
      entries.flatMap((entry) =>
        entry?.status === "ready" && entry.publicId
          ? [{ file: entry.file, publicId: entry.publicId }]
          : [],
      ),
    )
    current.onUploadStateChange?.(
      entries.length === 0
        ? "idle"
        : entries.some((entry) => !entry || entry.status === "error")
          ? "error"
          : entries.some(
                (entry) => entry?.status !== "ready" || !entry.publicId,
              )
            ? "uploading"
            : "ready",
    )
  }

  const publishSelection = (next: typeof selection.current) => {
    selection.current = next
    const current = callbacks.current
    current.onFilesChange(next.files)
    current.onCapturedAtChange(next.capturedAt)
    setLocalCoordinates(next.coordinates)
    current.onCoordinatesChange?.(next.coordinates)
    current.onCaptionsChange?.(next.captions)
    publishUploads()
  }

  // A parent's explicit reset invalidates only removed files, never other uploads.
  useEffect(() => {
    let changed = false
    for (const [file, entry] of uploads.current) {
      if (files.includes(file)) continue
      entry.controller?.abort()
      uploads.current.delete(file)
      changed = true
    }
    if (changed) publishUploads()
  }, [files])

  const validateImage = (file: File) => {
    if (!acceptedTypes.includes(file.type))
      return "Only JPG, JPEG or PNG images are accepted. Convert HEIC/HEIF photos to JPG or PNG first."
    if (file.size === 0) return "Image must not be empty."
    if (file.size > maxFileSizeBytes)
      return `Each image must be no larger than ${formatFileSize(maxFileSizeBytes)}.`
    return null
  }

  const processAndUpload = async (
    entry: PhotoUpload,
    gpsPromise?: ReturnType<typeof getCurrentGpsCoordinates>,
  ) => {
    if (entry.status === "uploading") return
    const attempt = ++entry.attempt
    entry.controller?.abort()
    const controller = new AbortController()
    entry.controller = controller
    const isCurrent = () =>
      mounted.current &&
      !controller.signal.aborted &&
      entry.attempt === attempt &&
      uploads.current.get(entry.file) === entry
    entry.error = null
    entry.publicId = null
    entry.status = entry.processed ? "uploading" : "processing"
    publishUploads()
    try {
      if (!entry.processed) {
        // Pickers are opened synchronously; GPS is optional and never gates selection.
        const gps = await (gpsPromise ?? getCurrentGpsCoordinates())
        if (!isCurrent()) return
        const index = selection.current.files.indexOf(entry.file)
        if (index < 0) return
        const captureTime = selection.current.capturedAt[index] ?? new Date()
        // Keep phone image decoding/canvas work serial; network uploads stay independent.
        const processing = processingQueue.current.then(() =>
          isCurrent()
            ? stampPhoto(entry.file, {
                capturedAt: captureTime,
                coordinates: gps,
                documentLabel,
                throwOnError: true,
              })
            : undefined,
        )
        processingQueue.current = processing.then(
          () => undefined,
          () => undefined,
        )
        const stamped = await processing
        if (!stamped || !isCurrent()) return
        const validationError = validateImage(stamped)
        if (validationError) throw new Error(validationError)
        const current = selection.current
        const currentIndex = current.files.indexOf(entry.file)
        if (currentIndex < 0) return
        uploads.current.delete(entry.file)
        entry.file = stamped
        entry.processed = true
        uploads.current.set(stamped, entry)
        publishSelection({
          files: current.files.map((file, i) =>
            i === currentIndex ? stamped : file,
          ),
          capturedAt: current.capturedAt,
          coordinates: current.files.map((_, i) =>
            i === currentIndex ? gps : (current.coordinates[i] ?? null),
          ),
          captions: current.captions,
        })
      }
      if (presignedEntity) {
        entry.status = "uploading"
        publishUploads()
        const publicId = await presignedUpload.upload({
          file: entry.file,
          entity: presignedEntity,
          signal: controller.signal,
        })
        if (!isCurrent()) return
        entry.publicId = publicId
      }
      entry.status = "ready"
    } catch (cause) {
      if (!isCurrent()) return
      entry.status = "error"
      entry.error = uploadErrorMessage(cause)
    }
    if (isCurrent()) publishUploads()
  }

  const addFiles = (picked: File[]) => {
    const retakeFile = retakeFileRef.current
    retakeFileRef.current = null
    if (!picked.length) return
    const current = selection.current
    if (retakeFile && !current.files.includes(retakeFile)) return
    const next = {
      files: [...current.files],
      capturedAt: [...current.capturedAt],
      coordinates: [...current.coordinates],
      captions: [...current.captions],
    }
    const newEntries: PhotoUpload[] = []
    const errors: string[] = []
    for (const file of retakeFile ? picked.slice(0, 1) : picked) {
      const validationError = validateImage(file)
      if (validationError) {
        errors.push(validationError)
        continue
      }
      if (!retakeFile && next.files.length >= maxFiles) {
        errors.push(
          `You can attach up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`,
        )
        break
      }
      const index = retakeFile
        ? next.files.indexOf(retakeFile)
        : next.files.length
      if (retakeFile) {
        const previous = uploads.current.get(retakeFile)
        if (previous) {
          previous.attempt += 1
          previous.controller?.abort()
        }
        uploads.current.delete(retakeFile)
      }
      const entry: PhotoUpload = {
        file,
        processed: false,
        status: "processing",
        publicId: null,
        error: null,
        attempt: 0,
      }
      uploads.current.set(file, entry)
      next.files[index] = file
      next.capturedAt[index] = new Date()
      next.coordinates[index] = null
      next.captions[index] = retakeFile ? (next.captions[index] ?? "") : ""
      newEntries.push(entry)
    }
    callbacks.current.onError?.([...new Set(errors)].join(" ") || null)
    if (!newEntries.length) return
    publishSelection(next)
    const gpsPromise = useDeviceGps
      ? getCurrentGpsCoordinates()
      : Promise.resolve(gpsCoordinates ?? null)
    for (const entry of newEntries) void processAndUpload(entry, gpsPromise)
  }

  const handleRetake = (index: number) => {
    retakeFileRef.current = files[index]
    cameraInputRef.current?.click()
  }

  const retryUpload = (index: number) => {
    const file = selection.current.files[index]
    if (!file) return
    let entry = uploads.current.get(file)
    if (entry && entry.status !== "error") return
    if (!entry) {
      entry = {
        file,
        processed: false,
        status: "error",
        publicId: null,
        error: null,
        attempt: 0,
      }
      uploads.current.set(file, entry)
    }
    void processAndUpload(entry)
  }

  const removeFile = (index: number) => {
    const current = selection.current
    const file = current.files[index]
    const entry = uploads.current.get(file)
    if (entry) {
      entry.attempt += 1
      entry.controller?.abort()
    }
    uploads.current.delete(file)
    publishSelection({
      files: current.files.filter((_, i) => i !== index),
      capturedAt: current.capturedAt.filter((_, i) => i !== index),
      coordinates: current.coordinates.filter((_, i) => i !== index),
      captions: current.captions.filter((_, i) => i !== index),
    })
    callbacks.current.onError?.(null)
  }

  const uploadStatuses = files.map(
    (file) => uploadSnapshot.get(file)?.status ?? "error",
  )
  return (
    <section className="min-w-0 space-y-4 border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
          {documentLabel}
        </h2>
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
          disabled={files.length >= maxFiles}
          className="min-h-12 gap-2 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#dc8400]"
          onClick={() => {
            retakeFileRef.current = null
            cameraInputRef.current?.click()
          }}
        >
          <Camera className="size-4" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={files.length >= maxFiles}
          className="min-h-12 gap-2 rounded-[2px]"
          onClick={() => {
            retakeFileRef.current = null
            galleryInputRef.current?.click()
          }}
        >
          <FolderOpen className="size-4" />
          From Gallery
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        JPG or PNG · Up to {formatFileSize(maxFileSizeBytes)} each. Camera opens
        the file picker on devices without camera capture.
      </p>
      <input
        ref={cameraInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        capture="environment"
        className="sr-only"
        aria-label="Take photo with camera"
        onChange={(event) => {
          const picked = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ""
          addFiles(picked)
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
          const picked = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ""
          addFiles(picked)
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {files.map((file, index) => {
          const coord = activeCoordinates[index]
          return (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="min-w-0 space-y-3"
            >
              <div className="relative overflow-hidden border border-slate-200">
                <div className="absolute left-2 top-2 z-30 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 bg-black/75 px-2 py-1 text-[11px] font-mono text-white shadow-sm">
                    <Clock className="size-3 text-orange-400" />
                    {formatTimestamp(capturedAt[index])}
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/75 px-2 py-1 text-[11px] font-mono text-white shadow-sm">
                    <MapPin className="size-3 text-cyan-400" />
                    {coord ? (
                      <span>
                        {coord.latitude.toFixed(4)},{" "}
                        {coord.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-300">GPS Unavailable</span>
                    )}
                  </div>
                </div>
                {(!presignedEntity || uploadStatuses[index] === "ready") && (
                  <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-white shadow-sm">
                    <ShieldCheck className="size-3 text-orange-400" />
                    {statusLabel}
                  </div>
                )}
                <ImageViewer
                  images={[
                    {
                      src: objectUrls[index],
                      title: file.name,
                      alt: documentLabel,
                    },
                  ]}
                  height={200}
                  width="100%"
                />
              </div>
              {/* Labelled shared input, like the web's other fields (it was a bare 48px box with only a placeholder). */}
              <label className="block text-xs font-medium text-slate-600">
                Caption <span className="font-normal text-slate-400">(optional)</span>
                <Input
                  value={captions[index] ?? ""}
                  onChange={(event) =>
                    onCaptionsChange?.(
                      files.map((_, current) =>
                        current === index
                          ? event.target.value
                          : (captions[current] ?? ""),
                      ),
                    )
                  }
                  placeholder="What this photo shows"
                  aria-label={`Caption for ${file.name}`}
                  className="mt-1 h-10 bg-white sm:h-9"
                />
              </label>
              {(presignedEntity ||
                uploadStatuses[index] === "processing" ||
                uploadStatuses[index] === "error") && (
                <div className="space-y-1" aria-live="polite">
                  <div className="flex flex-wrap items-center gap-2">
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
                          : uploadStatuses[index] === "processing"
                            ? "Preparing photo…"
                            : "Uploading image…"}
                    </p>
                    {uploadStatuses[index] === "error" && (
                      <button
                        type="button"
                        onClick={() => retryUpload(index)}
                        className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-orange-700 hover:underline focus-visible:outline-2 focus-visible:outline-[#f39200]"
                      >
                        <RefreshCw className="size-3" />
                        Retry
                      </button>
                    )}
                  </div>
                  {uploadStatuses[index] === "error" && (
                    <p className="break-words text-xs text-red-600">
                      {uploadSnapshot.get(file)?.error ??
                        "This photo has not been uploaded. Please retry."}
                    </p>
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
