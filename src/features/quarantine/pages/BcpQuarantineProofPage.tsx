import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDossierContext, useSubmitQuarantineProof } from '../hooks'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Form } from '@/shared/components/ui/form'
import { formatUtcTime } from '@/shared/utils/datetime'
import { PhotoCaptureSection } from '@/shared/components/PhotoCaptureSection'
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from '@/shared/constants/upload'
import {
  BcpLocationSection,
  QuickNotesSection,
} from '../components'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z
  .object({
    bcpName: z.string().min(1, 'BCP Location is required'),
    officialVetName: z.string().optional(),
    bcpReceiptNumber: z.string().optional(),
    // Allow a fast holdback report without forcing the driver/escort to write the full report.
    isHoldback: z.boolean(),
    quickNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isHoldback && !data.quickNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quickNote'],
        message: 'Reason is required when the trip is on holdback.',
      })
    }
  })

type FormValues = z.infer<typeof schema>

function formatRoute(dossier?: ReturnType<typeof useDossierContext>['data']): string {
  const summary = dossier?.bookingSummary
  if (!summary) return '—'
  const origin = summary.originPort || (summary.originCountry ? `${summary.originCountry.toUpperCase()} PORT` : 'DUBLIN PORT (IE DUB)')
  const dest = summary.destinationPort || (summary.destinationCountry ? `${summary.destinationCountry.toUpperCase()} FERRY TERMINAL` : 'DOVER FERRY TERMINAL (GB)')
  return `${origin} → ${dest}`
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function BcpQuarantineProofPage() {
  const { dossierId: dossierIdParam } = useParams<{ dossierId: string }>()
  const dossierId = dossierIdParam ?? null

  const { data: dossier, isLoading: dossierLoading } = useDossierContext(dossierId)
  const { mutateAsync: submitProof, isPending } = useSubmitQuarantineProof(dossierId ?? '')

  // ─── Photo state ──────────────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoTakenAt, setPhotoTakenAt] = useState<Date | null>(null)
  const [photoCoordinates, setPhotoCoordinates] = useState<({ latitude: number; longitude: number } | null)[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadedPublicIds, setUploadedPublicIds] = useState<string[]>([])
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle')

  // ─── Form ──────────────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bcpName: dossier?.bookingSummary?.originCountry
        ? `${dossier.bookingSummary.originCountry} BCP`
        : 'Dublin Port BCP (IE DUB)',
      officialVetName: '',
      bcpReceiptNumber: '',
      isHoldback: false,
      quickNote: '',
    },
  })

  useEffect(() => {
    const originCountry = dossier?.bookingSummary?.originCountry
    if (!originCountry) return
    form.setValue('bcpName', `${originCountry} BCP`)
  }, [dossier, form])

  const isHoldback = form.watch('isHoldback')

  const isMandatoryRoute = useMemo(() => {
    const origin = dossier?.bookingSummary?.originCountry?.trim().toLowerCase()
    const destination = dossier?.bookingSummary?.destinationCountry?.trim().toLowerCase()
    if (!origin || !destination) return true
    const ukIe = new Set(["united kingdom", "uk", "gb", "great britain", "ireland", "ie"])
    return ukIe.has(origin) || ukIe.has(destination)
  }, [dossier?.bookingSummary?.destinationCountry, dossier?.bookingSummary?.originCountry])

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (photoFile && (photoFile.size === 0 || photoFile.size > UPLOAD_MAX_BYTES || !['image/jpeg', 'image/jpg', 'image/png'].includes(photoFile.type)))
      return setPhotoError(`Use a non-empty JPEG or PNG image of at most ${UPLOAD_MAX_MB} MiB.`)
    if (isMandatoryRoute && !photoFile) {
      setPhotoError('Please attach a photo of the quarantine clearance sheet.')
      return
    }
    if (uploadState === 'uploading') {
      toast.info('Photo is still uploading. Please wait a moment...')
      return
    }
    if (uploadedPublicIds.length === 0) {
      setPhotoError('Photo upload failed or is not ready. Please try re-taking or selecting the photo.')
      return
    }
    if (dossierId == null) return

    try {
      await submitProof({
        bcpName: values.bcpName,
        officialVetName: values.officialVetName || undefined,
        bcpReceiptNumber: values.bcpReceiptNumber || undefined,
        inspectionAt: new Date().toISOString(),
        isHoldback: values.isHoldback,
        quickNote: values.quickNote || undefined,
        files: uploadedPublicIds.map((publicId) => ({ publicId })),
      })
      toast.success('Quarantine proof submitted successfully. Awaiting TS Verification.')
      form.reset()
      setPhotoFile(null)
      setPhotoTakenAt(null)
      setPhotoCoordinates([])
      setUploadedPublicIds([])
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UNKNOWN'
      const messages: Record<string, string> = {
        NOT_ASSIGNED_TO_TRIP: 'You are not assigned to this transport.',
        DOSSIER_NOT_APPROVED: 'The dossier must be APPROVED before submitting quarantine proof.',
        FILE_TOO_LARGE: `One or more files exceed the ${UPLOAD_MAX_MB} MiB limit.`,
        INVALID_FILE_TYPE: 'Invalid file type. Only images are accepted.',
        EVIDENCE_UNCLEAR: 'Upload failed or image unclear. Please retake photo.',
      }
      toast.error(messages[code] ?? 'Failed to submit proof. Please try again.')
    }
  }

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
  if (dossierLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <Skeleton className="h-10 w-64 rounded-[2px]" />
        <Skeleton className="h-20 w-full rounded-[2px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-44 w-full rounded-[2px]" />
            <Skeleton className="h-44 w-full rounded-[2px]" />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <Skeleton className="h-64 w-full rounded-[2px]" />
          </div>
        </div>
      </div>
    )
  }

  const tripCode = dossier?.bookingCode ?? ''
  const routeLabel = formatRoute(dossier)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 pb-32 sm:p-6 lg:pb-16">
      <div className="mx-auto max-w-2xl lg:max-w-6xl xl:max-w-7xl space-y-4">
        {/* Page Header Component from shared/components/PageHeader */}
        <PageHeader
          title="BCP QUARANTINE PROOF"
          backHref="/compliance-dossiers"
          backLabel="Compliance Dossiers"
        />

        {/* Trip Code & Navigation Route Subtitle */}
        <div className="border border-[#e5e2d9] bg-white p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-[#6c6963]">
              TRIP CODE: <span className="font-bold text-[#181818]">{tripCode}</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#181818]">
              <Navigation className="size-3.5 shrink-0 fill-[#f39200] text-[#f39200] rotate-45" aria-hidden />
              <span className="truncate">{routeLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                isMandatoryRoute
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800",
              )}
            >
              {isMandatoryRoute ? "Mandatory: EU ↔ UK/Ireland" : "Optional: Intra-EU Route"}
            </span>
            <span className="inline-flex items-center rounded-none bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-800">
              BCP Quarantine Flow
            </span>
          </div>
        </div>

        {!isMandatoryRoute && (
          <div className="border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950 flex items-start gap-2">
            <Navigation className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">Intra-EU Route: Quarantine Document Submission is Optional</p>
              <p className="mt-0.5 text-blue-800">
                Registered horses move under internal EU regulations with minimal restrictions. Submitting quarantine clearance proof is optional for this route, and is only mandatory for transports crossing to/from the UK or Ireland.
              </p>
            </div>
          </div>
        )}

        {/* Form sections */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Location & Quick Notes */}
              <div className="lg:col-span-7 space-y-4">
                {/* Section 1: Location & Inspection */}
                <BcpLocationSection form={form} isHoldback={isHoldback} />

                {/* Section 3: Quick Notes */}
                <QuickNotesSection form={form} />
              </div>

              {/* Right Column: Photo Proof & Desktop Action Card */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
                {/* Section 2: Photographic Proof (FileUploader & ImageViewer) */}
                <PhotoCaptureSection
                  files={photoFile ? [photoFile] : []}
                  capturedAt={photoTakenAt ? [photoTakenAt] : []}
                  coordinates={photoCoordinates}
                  error={photoError}
                  presignedEntity="attachment"
                  onUploadedPublicIdsChange={setUploadedPublicIds}
                  onUploadStateChange={setUploadState}
                  onFilesChange={(files) => {
                    setPhotoFile(files[0] ?? null)
                    setPhotoTakenAt(files[0] ? new Date() : null)
                    if (!files[0]) setUploadedPublicIds([])
                  }}
                  onCapturedAtChange={(values) => setPhotoTakenAt(values[0] ?? null)}
                  onCoordinatesChange={setPhotoCoordinates}
                  onError={setPhotoError}
                />

                {/* Desktop Summary & Submit Card */}
                <div className="hidden lg:block border border-[#e5e2d9] bg-white p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#181818] border-b border-[#e5e2d9] pb-2">
                    Submission Summary
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500 font-medium">Photo Proof</dt>
                      <dd className={cn("font-semibold", photoFile && (uploadedPublicIds.length > 0 || uploadState === 'ready') ? "text-emerald-700" : uploadState === 'uploading' ? "text-blue-600" : "text-amber-600")}>
                        {uploadState === 'uploading' ? "Uploading…" : photoFile && (uploadedPublicIds.length > 0 || uploadState === 'ready') ? "Uploaded ✓" : photoFile ? "Attached" : "Pending photo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">GPS Coordinates</dt>
                      <dd className="font-semibold text-slate-800 font-mono text-[11px]">
                        {photoCoordinates[0]
                          ? `${photoCoordinates[0].latitude.toFixed(4)}, ${photoCoordinates[0].longitude.toFixed(4)}`
                          : "Auto on capture"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Holdback Status</dt>
                      <dd className={cn("font-semibold", isHoldback ? "text-red-600" : "text-slate-700")}>
                        {isHoldback ? "Flagged Holdback" : "Standard"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Timestamp</dt>
                      <dd className="font-semibold text-slate-800 font-mono text-[11px]">
                        {photoTakenAt ? formatUtcTime(photoTakenAt) : "Live stamp"}
                      </dd>
                    </div>
                  </dl>

                  {photoError && (
                    <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 p-2.5" role="alert">
                      {photoError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isPending || uploadState === 'uploading'}
                    className={cn(
                      'w-full rounded-[2px] py-3.5 font-heading text-sm font-black uppercase tracking-widest',
                      'bg-[#f39200] text-white hover:bg-[#e08600] active:bg-[#c97800]',
                      'transition-colors disabled:opacity-50 cursor-pointer',
                    )}
                  >
                    {isPending ? 'Submitting…' : uploadState === 'uploading' ? 'Uploading Photo…' : 'Submit Proof ✓'}
                  </Button>
                  <p className="text-[11px] text-slate-500 text-center">
                    Submitted evidence will be queued for Transport Specialist verification.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Fixed Submit Bar on Mobile / Tablet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e2d9] bg-white px-4 pt-3 pb-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-[var(--sidebar-width)] lg:hidden">
        <div className="mx-auto max-w-2xl space-y-2">
          {photoError && (
            <p className="text-[11px] font-medium text-red-600" role="alert">{photoError}</p>
          )}
          <Button
            type="button"
            id="submit-proof-btn"
            disabled={isPending || uploadState === 'uploading'}
            onClick={form.handleSubmit(onSubmit)}
            className={cn(
              'w-full rounded-[2px] py-3.5 font-heading text-sm font-black uppercase tracking-widest',
              'bg-[#f39200] text-white hover:bg-[#e08600] active:bg-[#c97800]',
              'transition-colors disabled:opacity-50',
            )}
          >
            {isPending ? 'Submitting…' : uploadState === 'uploading' ? 'Uploading Photo…' : 'Submit Proof ✓'}
          </Button>
        </div>
      </div>
    </div>
  )
}
