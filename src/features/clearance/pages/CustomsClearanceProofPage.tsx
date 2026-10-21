import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClearanceDossierContext, useSubmitCustomsClearanceProof } from '../hooks'
import { CustomsEntrySection } from '../components/CustomsEntrySection'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Form } from '@/shared/components/ui/form'
import { QuickNotesSection } from '@/features/quarantine/components'
import { PhotoCaptureSection } from '@/shared/components/PhotoCaptureSection'

const schema = z.object({
  customsPortName: z.string().min(1, 'Customs office / border post is required'),
  mrnNumber: z.string().optional(),
  customsLane: z.enum(['GREEN_LANE', 'ORANGE_LANE', 'RED_LANE']).optional(),
  isHeld: z.boolean(),
  quickNote: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.isHeld && !data.quickNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quickNote'],
        message: 'Reason is required when the shipment is held.',
      })
    }
  })

type FormValues = z.infer<typeof schema>

function routeLabel(dossier?: ReturnType<typeof useClearanceDossierContext>['data']) {
  const summary = dossier?.bookingSummary
  if (!summary) return '—'
  const origin = summary.originPort || `${summary.originCountry.toUpperCase()} PORT`
  const destination = summary.destinationPort || `${summary.destinationCountry.toUpperCase()} TERMINAL`
  return `${origin} → ${destination}`
}

export default function CustomsClearanceProofPage() {
  const { dossierId: dossierIdParam } = useParams<{ dossierId: string }>()
  const dossierId = dossierIdParam ?? null
  const { data: dossier, isLoading } = useClearanceDossierContext(dossierId)
  const { mutateAsync: submitProof, isPending } = useSubmitCustomsClearanceProof(dossierId ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoTakenAt, setPhotoTakenAt] = useState<Date | null>(null)
  const [photoCoordinates, setPhotoCoordinates] = useState<({ latitude: number; longitude: number } | null)[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [uploadedPublicIds, setUploadedPublicIds] = useState<string[]>([])
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customsPortName: 'Dover Western Docks Customs Point (GB DOV)',
      mrnNumber: '',
      customsLane: undefined,
      isHeld: false,
      quickNote: '',
    },
  })

  useEffect(() => {
    if (dossier?.bookingSummary?.destinationPort) form.setValue('customsPortName', dossier.bookingSummary.destinationPort)
  }, [dossier, form])

  const isHeld = form.watch('isHeld')
  const selectedLane = form.watch('customsLane')

  const isMandatoryRoute = useMemo(() => {
    const origin = dossier?.bookingSummary?.originCountry?.trim().toLowerCase()
    const destination = dossier?.bookingSummary?.destinationCountry?.trim().toLowerCase()
    if (!origin || !destination) return true
    const ukIe = new Set(["united kingdom", "uk", "gb", "great britain", "ireland", "ie"])
    return ukIe.has(origin) || ukIe.has(destination)
  }, [dossier?.bookingSummary?.destinationCountry, dossier?.bookingSummary?.originCountry])

  const onSubmit = async (values: FormValues) => {
    if (isMandatoryRoute && !photoFile) return setPhotoError('Please attach a customs release note / SAD document image.')
    if (uploadState === 'uploading') {
      toast.info('Photo is still uploading. Please wait a moment...')
      return
    }
    if (isMandatoryRoute && uploadedPublicIds.length === 0) {
      return setPhotoError('Photo upload failed or is not ready. Please try re-taking or selecting the photo.')
    }
    if (dossierId == null) return
    try {
      await submitProof({
        ...values,
        files: uploadedPublicIds.map((publicId) => ({ publicId })),
      })
      toast.success('Customs proof submitted successfully. Awaiting TS Verification.')
      form.reset()
      setPhotoFile(null)
      setPhotoTakenAt(null)
      setPhotoCoordinates([])
      setUploadedPublicIds([])
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN'
      const messages: Record<string, string> = {
        NOT_ASSIGNED_TO_TRIP: 'You are not assigned to this transport.',
        QUARANTINE_NOT_PASSED: 'Quarantine must be passed before customs submission.',
        DOSSIER_NOT_APPROVED: 'The dossier must be APPROVED before submitting customs proof.',
        QUICK_NOTE_REQUIRED: 'Quick note is required when held.',
        FILE_TOO_LARGE: 'One or more files exceed the 5 MB limit.',
        INVALID_FILE_TYPE: 'Invalid file type. Only images are accepted.',
        EVIDENCE_UNCLEAR: 'Image unclear or missing customs stamp. Please retake photo.',
      }
      toast.error(messages[code] ?? 'Failed to submit customs proof. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <Skeleton className="h-10 w-64 rounded-[2px]" />
        <Skeleton className="h-20 w-full rounded-[2px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-72 w-full rounded-[2px]" />
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

  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 pb-32 sm:p-6 lg:pb-16">
      <div className="mx-auto max-w-2xl lg:max-w-6xl xl:max-w-7xl space-y-4">
        <PageHeader title="CUSTOMS CLEARANCE PROOF" backHref="/compliance-dossiers" backLabel="Compliance Dossiers" />

        {/* Trip Code & Route Card */}
        <div className="border border-[#e5e2d9] bg-white p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-[#6c6963]">
              TRIP CODE: <span className="font-bold text-[#181818]">{tripCode}</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#181818]">
              <Navigation className="size-3.5 rotate-45 fill-[#f39200] text-[#f39200]" aria-hidden />
              <span className="truncate">{routeLabel(dossier)}</span>
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
            <span className="inline-flex items-center rounded-none bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Customs Clearance Flow
            </span>
          </div>
        </div>

        {!isMandatoryRoute && (
          <div className="border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950 flex items-start gap-2">
            <Navigation className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">Intra-EU Route: Customs Clearance Submission is Optional</p>
              <p className="mt-0.5 text-blue-800">
                Transport within EU borders does not require customs clearance for registered equidae. Submitting customs release proof is optional for this route, and is only mandatory for transports crossing to/from the UK or Ireland.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customs Entry & Quick Notes */}
              <div className="lg:col-span-7 space-y-4">
                <CustomsEntrySection form={form} />
                <QuickNotesSection
                  form={form}
                  title="Driver Quick Notes"
                  label="Additional Notes"
                  placeholder="Note any customs delay, seal check remarks, or inspection notes…"
                />
              </div>

              {/* Right Column: Photo Proof & Desktop Actions */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
                <PhotoCaptureSection
                  files={photoFile ? [photoFile] : []}
                  capturedAt={photoTakenAt ? [photoTakenAt] : []}
                  coordinates={photoCoordinates}
                  documentLabel="Customs Release Note / SAD Document Image"
                  statusLabel="Pending Verification"
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

                {/* Desktop Summary & Action Card */}
                <div className="hidden lg:block border border-[#e5e2d9] bg-white p-5 space-y-4 shadow-sm">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#181818] border-b border-[#e5e2d9] pb-2">
                    Clearance Summary
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500 font-medium">SAD Document</dt>
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
                      <dt className="text-slate-500 font-medium">Routing Channel</dt>
                      <dd className="font-semibold text-slate-800">
                        {selectedLane ? selectedLane.replace('_LANE', '') : 'Not selected'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Inspection Status</dt>
                      <dd className={cn("font-semibold", isHeld ? "text-red-600" : "text-emerald-700")}>
                        {isHeld ? "Held / Detained" : "Cleared to Proceed"}
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
                    Submitted customs release will be verified by Transport Specialist.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Fixed Submit Bar on Mobile / Tablet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e2d9] bg-white px-4 pb-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-[var(--sidebar-width)] lg:hidden">
        <div className="mx-auto max-w-2xl space-y-2">
          {photoError && <p className="text-[11px] text-red-600" role="alert">{photoError}</p>}
          <Button
            type="button"
            disabled={isPending || uploadState === 'uploading'}
            onClick={form.handleSubmit(onSubmit)}
            className={cn(
              'w-full rounded-[2px] py-3.5 font-heading text-sm font-black uppercase tracking-widest',
              'bg-[#f39200] text-white hover:bg-[#e08600]',
              'disabled:opacity-50',
            )}
          >
            {isPending ? 'Submitting…' : uploadState === 'uploading' ? 'Uploading Photo…' : 'Submit Proof ✓'}
          </Button>
        </div>
      </div>
    </div>
  )
}
