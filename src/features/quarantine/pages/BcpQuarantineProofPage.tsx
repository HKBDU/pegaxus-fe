import { useState, useCallback } from 'react'
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
import {
  BcpLocationSection,
  PhotographicProofSection,
  QuickNotesSection,
} from '../components'

// ─── Schema ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB per file
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const schema = z
  .object({
    bcpName: z.string().min(1, 'BCP Location is required'),
    officialVetName: z.string().min(1, 'Official Veterinarian name is required'),
    bcpReceiptNumber: z.string().min(1, 'Clearance Receipt Number is required'),
    isHoldback: z.boolean(),
    quickNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isHoldback && !data.quickNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quickNote'],
        message: 'Quick note is required when cargo is held',
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
  const dossierId = dossierIdParam ? Number(dossierIdParam) : null

  const { data: dossier, isLoading: dossierLoading } = useDossierContext(dossierId)
  const { mutateAsync: submitProof, isPending } = useSubmitQuarantineProof(dossierId ?? 0)

  // ─── Photo state ──────────────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoTakenAt, setPhotoTakenAt] = useState<Date | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handleFilePicked = useCallback((file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images are accepted.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be ≤ 5 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoTakenAt(new Date())
    setPhotoError(null) // clear error once photo attached
  }, [])

  const handleRemovePhoto = useCallback(() => {
    setPhotoFile(null)
    setPhotoTakenAt(null)
  }, [])

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

  const watchIsHeld = form.watch('isHoldback')

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    if (!photoFile) {
      setPhotoError('Please attach a photo of the quarantine clearance sheet.')
      return
    }
    if (dossierId == null) return

    try {
      await submitProof({
        bcpName: values.bcpName,
        officialVetName: values.officialVetName || undefined,
        bcpReceiptNumber: values.bcpReceiptNumber || undefined,
        isHoldback: values.isHoldback,
        quickNote: values.quickNote || undefined,
        files: [photoFile],
      })
      toast.success('Quarantine proof submitted. Awaiting TS verification.')
      form.reset()
      setPhotoFile(null)
      setPhotoTakenAt(null)
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UNKNOWN'
      const messages: Record<string, string> = {
        NOT_ASSIGNED_TO_TRIP: 'You are not assigned to this transport.',
        DOSSIER_NOT_APPROVED: 'The dossier must be APPROVED before submitting quarantine proof.',
        QUICK_NOTE_REQUIRED: 'Quick note is required when cargo is held.',
        FILE_TOO_LARGE: 'One or more files exceed the 5 MB limit.',
        INVALID_FILE_TYPE: 'Invalid file type. Only images are accepted.',
        EVIDENCE_UNCLEAR: 'Upload failed or image unclear. Please retake photo.',
      }
      toast.error(messages[code] ?? 'Failed to submit proof. Please try again.')
    }
  }

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
  if (dossierLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 p-6">
        <Skeleton className="h-10 w-64 rounded-[2px]" />
        <Skeleton className="h-20 w-full rounded-[2px]" />
        <Skeleton className="h-44 w-full rounded-[2px]" />
        <Skeleton className="h-44 w-full rounded-[2px]" />
      </div>
    )
  }

  const tripCode = dossier?.bookingCode ?? ''
  const routeLabel = formatRoute(dossier)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f7] p-4 pb-32 sm:p-6 sm:pb-32">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Page Header Component from shared/components/PageHeader */}
        <PageHeader
          title="BCP QUARANTINE PROOF"
          backHref="/compliance-dossiers"
          backLabel="Compliance Dossiers"
        />

        {/* Trip Code & Navigation Route Subtitle */}
        <div className="space-y-1 pb-1">
          <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-[#6c6963]">
            TRIP CODE: <span className="font-bold text-[#181818]">{tripCode}</span>
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#181818]">
            <Navigation className="size-3.5 shrink-0 fill-[#f39200] text-[#f39200] rotate-45" aria-hidden />
            <span className="truncate">{routeLabel}</span>
          </div>
        </div>

        {/* Form sections */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Section 1: Location & Inspection (BCP Location, Official Vet, Receipt No, Holdback toggle) */}
            <BcpLocationSection form={form} watchIsHeld={watchIsHeld} />

            {/* Section 2: Photographic Proof (FileUploader & ImageViewer) */}
            <PhotographicProofSection
              photoFile={photoFile}
              photoTakenAt={photoTakenAt}
              isHeld={watchIsHeld}
              onFilePicked={handleFilePicked}
              onRemovePhoto={handleRemovePhoto}
              error={photoError}
            />

            {/* Section 3: Quick Notes */}
            {!watchIsHeld && <QuickNotesSection form={form} />}
          </form>
        </Form>
      </div>

      {/* Fixed Submit Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e2d9] bg-white px-4 pt-3 pb-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-[var(--sidebar-width)]">
        <div className="mx-auto max-w-2xl space-y-2">
          {photoError && (
            <p className="text-[11px] font-medium text-red-600" role="alert">{photoError}</p>
          )}
          <Button
            type="button"
            id="submit-proof-btn"
            disabled={isPending}
            onClick={form.handleSubmit(onSubmit)}
            className={cn(
              'w-full rounded-[2px] py-3.5 font-heading text-sm font-black uppercase tracking-widest',
              'bg-[#f39200] text-white hover:bg-[#e08600] active:bg-[#c97800]',
              'transition-colors disabled:opacity-50',
            )}
          >
            {isPending ? 'Submitting…' : 'Submit Proof ✓'}
          </Button>
        </div>
      </div>
    </div>
  )
}
