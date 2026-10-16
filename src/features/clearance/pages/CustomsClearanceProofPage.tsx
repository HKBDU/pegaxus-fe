import { useCallback, useEffect, useState } from 'react'
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
import { PhotographicProofSection, QuickNotesSection } from '@/features/quarantine/components'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
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
  const [photoError, setPhotoError] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customsPortName: 'Dover Western Docks Customs Point (GB DOV)', mrnNumber: '', customsLane: undefined, isHeld: false, quickNote: '' },
  })
  useEffect(() => {
    if (dossier?.bookingSummary?.destinationPort) form.setValue('customsPortName', dossier.bookingSummary.destinationPort)
  }, [dossier, form])

  const handleFilePicked = useCallback((file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error('Only JPG or PNG images are accepted.')
    if (file.size > MAX_FILE_SIZE) return toast.error('Image must be ≤ 5 MB.')
    setPhotoFile(file); setPhotoTakenAt(new Date()); setPhotoError(null)
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (!photoFile) return setPhotoError('Please attach a customs release note / SAD document image.')
    if (dossierId == null) return
    try {
      await submitProof({ ...values, files: [photoFile] })
      toast.success('Customs proof submitted successfully. Awaiting TS Verification.')
      form.reset(); setPhotoFile(null); setPhotoTakenAt(null)
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

  if (isLoading) return <div className="mx-auto max-w-2xl space-y-5 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-72 w-full" /><Skeleton className="h-44 w-full" /></div>
  const tripCode = dossier?.bookingCode ?? ''
  return <div className="min-h-screen bg-[#faf9f7] p-4 pb-32 sm:p-6 sm:pb-32"><div className="mx-auto max-w-2xl space-y-4">
    <PageHeader title="CUSTOMS CLEARANCE PROOF" backHref="/compliance-dossiers" backLabel="Compliance Dossiers" />
    <div className="space-y-1 pb-1"><p className="font-heading text-[11px] font-bold uppercase tracking-wider text-[#6c6963]">TRIP CODE: <span className="text-[#181818]">{tripCode}</span></p><div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"><Navigation className="size-3.5 rotate-45 fill-[#f39200] text-[#f39200]" aria-hidden /><span className="truncate">{routeLabel(dossier)}</span></div></div>
    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <CustomsEntrySection form={form} />
      <PhotographicProofSection photoFile={photoFile} photoTakenAt={photoTakenAt} documentLabel="Customs Release Note / SAD Document Image" statusLabel="Pending Verification" onFilePicked={handleFilePicked} onRemovePhoto={() => { setPhotoFile(null); setPhotoTakenAt(null) }} error={photoError} />
      <QuickNotesSection form={form} title="Driver Quick Notes" label="Additional Notes" placeholder="Note any customs delay, seal check remarks, or inspection notes…" />
    </form></Form>
  </div><div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e2d9] bg-white px-4 pb-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:left-[var(--sidebar-width)]"><div className="mx-auto max-w-2xl space-y-2">{photoError && <p className="text-[11px] text-red-600" role="alert">{photoError}</p>}<Button type="button" disabled={isPending} onClick={form.handleSubmit(onSubmit)} className={cn('w-full rounded-[2px] py-3.5 font-heading text-sm font-black uppercase tracking-widest', 'bg-[#f39200] text-white hover:bg-[#e08600]', 'disabled:opacity-50')}>{isPending ? 'Submitting…' : 'Submit Proof ✓'}</Button></div></div></div>
}
