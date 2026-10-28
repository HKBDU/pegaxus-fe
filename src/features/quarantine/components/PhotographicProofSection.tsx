import { useRef, useMemo } from 'react'
import { Camera, FolderOpen, RotateCcw, Trash2, Clock, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import ImageViewer from '@/shared/components/file-viewer/ImageViewer'
import { QuarantineSectionHeader } from './QuarantineSectionHeader'
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from '@/shared/constants/upload'
import { toast } from 'sonner'

interface PhotographicProofSectionProps {
  photoFile: File | null
  photoTakenAt: Date | null
  documentLabel?: string
  statusLabel?: string
  onFilePicked: (file: File | undefined) => void
  onRemovePhoto: () => void
  error?: string | null
}

function formatDateTimeStamp(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function PhotographicProofSection({
  photoFile,
  photoTakenAt,
  documentLabel = 'BCP Clearance Sheet / Certificate Image',
  statusLabel = 'Pending Verification',
  onFilePicked,
  onRemovePhoto,
  error,
}: PhotographicProofSectionProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pickFile = (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (file.size === 0 || file.size > UPLOAD_MAX_BYTES || !['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error(`Use a non-empty JPEG or PNG image of at most ${UPLOAD_MAX_MB} MiB.`)
      return
    }
    onFilePicked(file)
  }

  const imageViewerSlides = useMemo(() => {
    if (!photoFile) return []
    const url = URL.createObjectURL(photoFile)
    return [
      {
        src: url,
        title: photoFile.name,
        alt: 'BCP Quarantine proof document',
      },
    ]
  }, [photoFile])

  return (
    <section className="space-y-4 border border-[#e5e2d9] bg-white p-5">
      <QuarantineSectionHeader
        title="Photographic Proof"
        badge={
          photoFile ? (
            <span className="font-heading text-xs font-bold uppercase text-[#f39200]">
              1 File Attached
            </span>
          ) : null
        }
      />

      {/* Sub-label — plain bold uppercase, NOT Field */}
      <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-[#181818]">
        {documentLabel}
      </p>
      {error && (
        <p className="text-[10px] font-medium leading-[15px] text-red-600" role="alert">{error}</p>
      )}

      {/* ── Two buttons always visible ── */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          id="take-photo-btn"
          className="flex items-center justify-center gap-2 bg-[#f39200] font-bold uppercase text-white hover:bg-[#e08600] active:bg-[#c97800]"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" aria-hidden />
          Take Photo
        </Button>
        <Button
          type="button"
          id="from-gallery-btn"
          variant="outline"
          className="flex items-center justify-center gap-2 border-[#2b2b2b] bg-[#2b2b2b] font-bold uppercase text-white hover:bg-[#181818] hover:border-[#181818]"
          onClick={() => galleryInputRef.current?.click()}
        >
          <FolderOpen className="size-4" aria-hidden />
          From Gallery
        </Button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Take photo with camera"
        onChange={(e) => pickFile(e.currentTarget)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="sr-only"
        aria-label="Select from gallery"
        onChange={(e) => pickFile(e.currentTarget)}
      />

      {/* ── Photo preview (shown when photo is attached) ── */}
      {photoFile && (
        <div className="space-y-3">
          <div className="relative overflow-hidden border border-[#e5e2d9]">
            {/* Timestamp overlay */}
            <div className="absolute left-2 top-2 z-30 flex items-center gap-1.5 bg-black/70 px-2 py-1 pointer-events-none">
              <Clock className="size-3 text-white" aria-hidden />
              <span className="font-mono text-[11px] text-white">
                {photoTakenAt ? formatDateTimeStamp(photoTakenAt) : ''}
              </span>
            </div>

            {/* Status badge */}
            <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1 bg-slate-700 px-2 py-0.5 pointer-events-none">
              <ShieldCheck className="size-3 text-white" aria-hidden />
              <span className="text-[11px] font-bold uppercase text-white">{statusLabel}</span>
            </div>

            <ImageViewer images={imageViewerSlides} height={300} width="100%" />
          </div>

          {/* Retake / Remove actions */}
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#181818] transition-colors hover:text-[#f39200]"
            >
              <RotateCcw className="size-4" aria-hidden />
              Retake Photo
            </button>
            <button
              type="button"
              onClick={onRemovePhoto}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#181818] transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
