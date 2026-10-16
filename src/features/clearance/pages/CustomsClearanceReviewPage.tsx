import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import { Check, FileText, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { normalizeRole } from '@/features/auth/access-control'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Field } from '@/shared/components/Field'
import { cn } from '@/lib/utils'
import { useCustomsClearanceProofDetail, useFinalizeCustomsClearanceProof } from '../hooks'
import type { CustomsLane, FinalizeCustomsClearanceProofRequest } from '../types'

const INPUT = 'w-full border border-[#d8d5ce] bg-[#f4f4f4] px-3 py-2.5 text-sm text-[#181818] focus:border-[#f39200] focus:outline-none focus:ring-1 focus:ring-[#f39200]'
const LANE_OPTIONS: CustomsLane[] = ['GREEN_LANE', 'ORANGE_LANE', 'RED_LANE']
const FINAL_STATUSES = ['CLEARED', 'HELD', 'REJECTED'] as const

const finalizeSchema = z.object({
  mrnNumber: z.string().trim().min(1, 'Official MRN is required.'),
  customsLane: z.enum(['GREEN_LANE', 'ORANGE_LANE', 'RED_LANE']),
  ataCarnetExpiryDate: z.string().optional(),
  status: z.enum(FINAL_STATUSES),
  verificationNote: z.string().optional(),
})

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('en-GB') : '—'
}

function laneLabel(lane: CustomsLane | null | undefined) {
  return lane?.replace('_LANE', '') ?? 'Not provided'
}

export default function CustomsClearanceReviewPage() {
  const { proofId: proofIdParam } = useParams<{ proofId: string }>()
  const proofId = proofIdParam ?? null
  const { data: proof, isLoading } = useCustomsClearanceProofDetail(proofId)
  const { mutateAsync: finalizeProof, isPending } = useFinalizeCustomsClearanceProof(proofId ?? '')
  const roles = useAuthStore((state) => state.principal?.roles ?? [])
  const canFinalize = roles.some((role) => normalizeRole(role) === 'TRANSPORT_SPECIALIST')

  const [action, setAction] = useState<'FINALIZE' | 'REJECT_PROOF'>('FINALIZE')
  const [mrnNumber, setMrnNumber] = useState('')
  const [customsLane, setCustomsLane] = useState<CustomsLane | ''>('')
  const [status, setStatus] = useState<(typeof FINAL_STATUSES)[number]>('CLEARED')
  const [ataCarnetExpiryDate, setAtaCarnetExpiryDate] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  // Driver values are the review baseline. TS edits become the official values.
  useEffect(() => {
    if (!proof) return
    setMrnNumber(proof.mrnNumber ?? '')
    setCustomsLane(proof.customsLane ?? '')
    setAtaCarnetExpiryDate(proof.ataCarnetExpiryDate ?? proof.ataCarnet?.expiryDate ?? '')
    if (FINAL_STATUSES.includes(proof.status as (typeof FINAL_STATUSES)[number])) {
      setStatus(proof.status as (typeof FINAL_STATUSES)[number])
    }
  }, [proof])

  if (isLoading) return <div className="mx-auto max-w-7xl space-y-5 p-6"><Skeleton className="h-12 w-80" /><Skeleton className="h-[32rem] w-full" /></div>
  if (!proof) return <div className="p-6 text-sm text-red-600">Customs proof not found.</div>

  const submittedMrn = proof.mrnNumber ?? ''
  const submittedLane = proof.customsLane ?? ''
  const submittedAtaExpiry = proof.ataCarnetExpiryDate ?? proof.ataCarnet?.expiryDate ?? ''
  const hasChanged = mrnNumber !== submittedMrn || customsLane !== submittedLane || ataCarnetExpiryDate !== submittedAtaExpiry
  const requiresVerificationNote = hasChanged || status === 'HELD'
  const firstFile = proof.files[0]

  const handleFinalize = async () => {
    if (!canFinalize || proof.isFinalized) return
    if (action === 'REJECT_PROOF' && !rejectionReason.trim()) return toast.error('Rejection reason is required.')

    const result = finalizeSchema.safeParse({ mrnNumber, customsLane, ataCarnetExpiryDate, status, verificationNote })
    if (action === 'FINALIZE' && !result.success) return toast.error(result.error.issues[0]?.message ?? 'Please complete required fields.')
    if (action === 'FINALIZE' && requiresVerificationNote && !verificationNote.trim()) return toast.error('Verification note is required when TS changes Driver data.')

    const payload: FinalizeCustomsClearanceProofRequest = action === 'FINALIZE'
      ? { action, mrnNumber, customsLane: customsLane || undefined, ataCarnetExpiryDate: ataCarnetExpiryDate || undefined, status, verificationNote: verificationNote || undefined, rejectionReason: status === 'REJECTED' ? rejectionReason.trim() : undefined }
      : { action, rejectionReason: rejectionReason.trim() }
    try {
      await finalizeProof(payload)
      toast.success(action === 'FINALIZE' ? 'Customs clearance result officially verified & recorded.' : 'Customs proof rejected. Driver must submit new evidence.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update customs proof.')
    }
  }

  return <div className="min-h-screen bg-[#faf9f7] p-3 sm:p-6"><div className="mx-auto max-w-7xl space-y-4">
    <PageHeader title="VERIFY & FINALIZE CUSTOMS CLEARANCE RESULT" backHref="/compliance-dossiers" backLabel="Compliance Dossiers" />
    <div className="border border-[#e5e2d9] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8c918a] sm:px-6">DOSSIER: {proof.complianceDossierId} <span className="mx-2">|</span> PROOF: #{proof.customsClearanceProofId} <span className="mx-2">|</span> SUBMITTED: {formatDate(proof.submittedAt)}</div>
    <div className="grid overflow-hidden border border-[#e5e2d9] bg-white lg:grid-cols-[1.25fr_0.95fr]">
      <section className="min-w-0 border-b border-[#e5e2d9] p-4 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-heading text-sm font-bold uppercase tracking-wider">Customs Clearance Proof</h2><span className="bg-[#f39200] px-2 py-1 text-[10px] font-bold uppercase text-white">{proof.status.replaceAll('_', ' ')}</span></div>
        <div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden bg-[#191c1d] sm:min-h-[28rem]">
          {firstFile ? <a href={firstFile.fileUrl} target="_blank" rel="noreferrer" className="block h-full w-full"><img src={firstFile.fileUrl} alt={firstFile.fileName} className="h-full max-h-[32rem] w-full object-contain" /></a> : <div className="flex flex-col items-center gap-2 text-slate-400"><FileText className="size-10" aria-hidden /><span>No evidence uploaded</span></div>}
          {firstFile && <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-[#181818]/90 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white"><ShieldCheck className="size-3 text-[#f39200]" aria-hidden /> Evidence uploaded</div>}
        </div>
        <dl className="mt-4 grid gap-3 border-t border-[#e5e2d9] pt-4 text-xs sm:grid-cols-2"><div><dt className="font-bold uppercase text-[#8c918a]">Submitted by</dt><dd className="mt-1 font-medium">{proof.submittedBy.fullName}</dd></div><div><dt className="font-bold uppercase text-[#8c918a]">Timestamp</dt><dd className="mt-1 font-medium">{formatDate(proof.submittedAt)}</dd></div><div className="sm:col-span-2"><dt className="font-bold uppercase text-[#8c918a]">Customs post</dt><dd className="mt-1 font-medium">{proof.customsPortName}</dd></div></dl>
      </section>
      <section className="space-y-5 p-4 sm:p-6">
        <div><h2 className="border-l-4 border-[#f39200] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Customs Declaration & MRN</h2><div className="mt-3 space-y-3"><Field label="Movement Reference Number (MRN)"><input className={INPUT} value={mrnNumber} onChange={(event) => setMrnNumber(event.target.value)} disabled={!canFinalize || proof.isFinalized} /></Field><div className="border border-[#e5e2d9] bg-[#f4f4f4] p-3"><p className="text-[10px] font-bold uppercase text-[#8c918a]">ATA Carnet Validity / Expiry Date</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><input type="date" className="bg-transparent text-sm font-bold" value={ataCarnetExpiryDate} onChange={(event) => setAtaCarnetExpiryDate(event.target.value)} disabled={!canFinalize || proof.isFinalized} /><span className="text-[10px] font-bold uppercase text-[#f39200]">{proof.ataCarnet?.status ?? 'Not linked'}</span></div></div></div></div>
        <div><h2 className="border-l-4 border-[#f39200] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Routing Channel Determination</h2><div className="mt-3 grid grid-cols-3 gap-2">{LANE_OPTIONS.map((lane) => <button key={lane} type="button" disabled={!canFinalize || proof.isFinalized} onClick={() => setCustomsLane(lane)} className={cn('border px-2 py-3 text-[11px] font-bold uppercase transition-colors', customsLane === lane ? 'border-[#f39200] bg-[#fff8ed]' : 'border-[#d8d5ce] bg-white', !canFinalize && 'cursor-default')}><span className={cn('mr-1', lane === 'GREEN_LANE' ? 'text-emerald-600' : lane === 'ORANGE_LANE' ? 'text-orange-500' : 'text-red-500')}>●</span>{lane.replace('_LANE', '')}</button>)}</div><p className="mt-2 text-[10px] text-[#8c918a]">Driver submitted: <b>{laneLabel(proof.customsLane)}</b></p></div>
        <div><h2 className="border-l-4 border-[#181818] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Regulatory Decision</h2><div className="mt-3 grid grid-cols-3 gap-2">{FINAL_STATUSES.map((option) => <button key={option} type="button" disabled={!canFinalize || proof.isFinalized} onClick={() => setStatus(option)} className={cn('border px-2 py-3 text-[10px] font-bold uppercase', status === option ? 'border-[#f39200] bg-[#fff8ed]' : 'border-[#d8d5ce] bg-white', option === 'REJECTED' && 'text-red-600')}>{status === option && <Check className="mx-auto mb-1 size-4 text-[#f39200]" aria-hidden />}{option.replace('_', ' ')}</button>)}</div></div>
        {canFinalize && !proof.isFinalized && <div className="space-y-3">{requiresVerificationNote && action === 'FINALIZE' && <Field label="Verification Note *"><textarea className={cn(INPUT, 'resize-none')} rows={3} value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Explain the difference from Driver submission…" /></Field>}{action === 'REJECT_PROOF' && <Field label="Rejection Reason *"><textarea className={cn(INPUT, 'resize-none')} rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></Field>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setAction(action === 'FINALIZE' ? 'REJECT_PROOF' : 'FINALIZE')}>{action === 'FINALIZE' ? 'Reject Proof' : 'Back to Finalize'}</Button><Button type="button" disabled={isPending} onClick={handleFinalize} className="bg-[#f39200] font-bold uppercase text-white hover:bg-[#e08600]">{isPending ? 'Saving…' : action === 'FINALIZE' ? '✓ Finalize Record' : 'Reject Proof'}</Button></div></div>}
        {!canFinalize && <div className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Read-only view. Only Transport Specialist can verify or finalize this record.</div>}
        {proof.isFinalized && <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">This record is finalized and read-only.</div>}
      </section>
    </div>
  </div></div>
}
