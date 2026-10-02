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
import { useFinalizeQuarantineProof, useQuarantineProofDetail } from '../hooks'
import type { FinalizeQuarantineProofRequest } from '../types'

const INPUT = 'w-full border border-[#d8d5ce] bg-[#f4f4f4] px-3 py-2.5 text-sm text-[#181818] focus:border-[#f39200] focus:outline-none focus:ring-1 focus:ring-[#f39200]'
const RESULTS = ['PASSED', 'PASSED_WITH_CONDITIONS', 'FAILED'] as const
const schema = z.object({
  officialVetName: z.string().trim().min(1, 'Official veterinarian name is required.'),
  bcpReceiptNo: z.string().trim().min(1, 'VET clearance receipt number is required.'),
  status: z.enum(RESULTS),
  conditions: z.string().optional(),
  verificationNote: z.string().optional(),
})

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('en-GB') : '—'
}

export default function QuarantineReviewPage() {
  const { proofId: proofIdParam } = useParams<{ proofId: string }>()
  const proofId = proofIdParam ? Number(proofIdParam) : null
  const { data: proof, isLoading } = useQuarantineProofDetail(proofId)
  const { mutateAsync: finalizeProof, isPending } = useFinalizeQuarantineProof(proofId ?? 0)
  const roles = useAuthStore((state) => state.principal?.roles ?? [])
  const canFinalize = roles.some((role) => normalizeRole(role) === 'TRANSPORT_SPECIALIST')
  const [action, setAction] = useState<'FINALIZE' | 'REJECT_PROOF'>('FINALIZE')
  const [bcpName, setBcpName] = useState('')
  const [officialVetName, setOfficialVetName] = useState('')
  const [bcpReceiptNo, setBcpReceiptNo] = useState('')
  const [status, setStatus] = useState<(typeof RESULTS)[number]>('PASSED')
  const [conditions, setConditions] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [matchedHorses, setMatchedHorses] = useState<Record<number, boolean>>({})

  // Driver/Escort values are the review baseline. TS edits become official values.
  useEffect(() => {
    if (!proof) return
    setBcpName(proof.bcpName)
    setOfficialVetName(proof.officialVeterinarianName ?? '')
    setBcpReceiptNo(proof.bcpReceiptNumber ?? '')
    setMatchedHorses(Object.fromEntries((proof.microchipChecklist ?? []).map((item) => [item.horseId, item.isMatched])))
    if (proof.status === 'PASSED' || proof.status === 'PASSED_WITH_CONDITIONS' || proof.status === 'FAILED') setStatus(proof.status)
  }, [proof])

  if (isLoading) return <div className="mx-auto max-w-7xl space-y-5 p-6"><Skeleton className="h-12 w-80" /><Skeleton className="h-[32rem] w-full" /></div>
  if (!proof) return <div className="p-6 text-sm text-red-600">Quarantine proof not found.</div>

  const firstFile = proof.files[0]
  const changed = bcpName !== proof.bcpName || officialVetName !== (proof.officialVeterinarianName ?? '') || bcpReceiptNo !== (proof.bcpReceiptNumber ?? '')
  const requiresNote = changed || status !== 'PASSED'
  const horses = proof.expectedHorses ?? []
  const checklist = horses.map((horse) => ({ horseId: horse.horseId, microchipNumber: horse.microchipNumber, isMatched: matchedHorses[horse.horseId] === true }))
  const allMatched = checklist.length > 0 && checklist.every((item) => item.isMatched)

  const handleFinalize = async () => {
    if (!canFinalize || proof.isFinalized) return
    if (action === 'REJECT_PROOF' && !rejectionReason.trim()) return toast.error('Rejection reason is required.')
    const validation = schema.safeParse({ officialVetName, bcpReceiptNo, status, conditions, verificationNote })
    if (action === 'FINALIZE' && !validation.success) return toast.error(validation.error.issues[0]?.message ?? 'Please complete required fields.')
    if (action === 'FINALIZE' && !allMatched) return toast.error('All horses must be checked before finalizing.')
    if (action === 'FINALIZE' && requiresNote && !verificationNote.trim()) return toast.error('Verification note is required when TS changes submitted data.')
    if (action === 'FINALIZE' && status === 'PASSED_WITH_CONDITIONS' && !conditions.trim()) return toast.error('Conditions are required.')
    const payload: FinalizeQuarantineProofRequest = action === 'FINALIZE'
      ? { action, officialVetName, bcpReceiptNo, status, conditions: conditions || undefined, verificationNote: verificationNote || undefined, microchipChecklist: checklist }
      : { action, rejectionReason: rejectionReason.trim() }
    try {
      await finalizeProof(payload)
      toast.success(action === 'FINALIZE' ? 'Quarantine inspection result officially verified & recorded.' : 'Quarantine proof rejected. New evidence is required.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update quarantine proof.')
    }
  }

  return <div className="min-h-screen bg-[#faf9f7] p-3 sm:p-6"><div className="mx-auto max-w-7xl space-y-4">
    <PageHeader title="VERIFY & FINALIZE QUARANTINE RESULT" backHref="/compliance-dossiers" backLabel="Compliance Dossiers" />
    <div className="border border-[#e5e2d9] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#8c918a] sm:px-6">DOSSIER: {proof.complianceDossierId} <span className="mx-2">|</span> PROOF: #{proof.quarantineProofId} <span className="mx-2">|</span> SUBMITTED: {formatDate(proof.submittedAt)}</div>
    <div className="grid overflow-hidden border border-[#e5e2d9] bg-white lg:grid-cols-[1.25fr_0.95fr]">
      <section className="min-w-0 border-b border-[#e5e2d9] p-4 sm:p-6 lg:border-b-0 lg:border-r"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-heading text-sm font-bold uppercase tracking-wider">BCP Clearance Proof</h2><span className="bg-[#f39200] px-2 py-1 text-[10px] font-bold uppercase text-white">{proof.status.replaceAll('_', ' ')}</span></div><div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden bg-[#191c1d] sm:min-h-[28rem]">{firstFile ? <a href={firstFile.fileUrl} target="_blank" rel="noreferrer" className="block h-full w-full"><img src={firstFile.fileUrl} alt={firstFile.fileName} className="h-full max-h-[32rem] w-full object-contain" /></a> : <div className="flex flex-col items-center gap-2 text-slate-400"><FileText className="size-10" aria-hidden /><span>No evidence uploaded</span></div>}{firstFile && <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-[#181818]/90 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white"><ShieldCheck className="size-3 text-[#f39200]" aria-hidden /> Evidence uploaded</div>}</div><dl className="mt-4 grid gap-3 border-t border-[#e5e2d9] pt-4 text-xs sm:grid-cols-2"><div><dt className="font-bold uppercase text-[#8c918a]">Submitted by</dt><dd className="mt-1 font-medium">{proof.submittedBy.fullName}</dd></div><div><dt className="font-bold uppercase text-[#8c918a]">Timestamp</dt><dd className="mt-1 font-medium">{formatDate(proof.submittedAt)}</dd></div><div className="sm:col-span-2"><dt className="font-bold uppercase text-[#8c918a]">BCP code</dt><dd className="mt-1 font-medium">{proof.bcpName}</dd></div></dl></section>
      <section className="space-y-5 p-4 sm:p-6"><div><h2 className="border-l-4 border-[#f39200] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Microchip Cross-Check</h2><div className="mt-3 space-y-2">{horses.length ? horses.map((horse) => <label key={horse.horseId} className="flex cursor-pointer items-center gap-3 border border-[#e5e2d9] bg-[#f4f4f4] p-3"><input type="checkbox" checked={matchedHorses[horse.horseId] === true} disabled={!canFinalize || proof.isFinalized} onChange={(event) => setMatchedHorses((current) => ({ ...current, [horse.horseId]: event.target.checked }))} className="size-4 accent-[#f39200]" /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{horse.horseName}</b><small className="font-mono text-[11px] text-[#6c6963]">{horse.microchipNumber}</small></span><span className="text-[10px] font-bold uppercase">{matchedHorses[horse.horseId] ? 'MATCH' : 'CHECK'}</span></label>) : <p className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No expected horse list returned by API.</p>}</div></div>
        <div><h2 className="border-l-4 border-[#181818] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Validation Credentials</h2><div className="mt-3 space-y-3"><Field label="Official Veterinarian Name *"><input className={INPUT} value={officialVetName} onChange={(event) => setOfficialVetName(event.target.value)} disabled={!canFinalize || proof.isFinalized} /></Field><Field label="VET Clearance Receipt Number *"><input className={INPUT} value={bcpReceiptNo} onChange={(event) => setBcpReceiptNo(event.target.value)} disabled={!canFinalize || proof.isFinalized} /></Field><Field label="BCP Location *"><input className={INPUT} value={bcpName} onChange={(event) => setBcpName(event.target.value)} disabled={!canFinalize || proof.isFinalized} /></Field></div></div>
        <div><h2 className="border-l-4 border-[#f39200] pl-3 font-heading text-sm font-bold uppercase tracking-wider">Regulatory Decision</h2><div className="mt-3 grid grid-cols-3 gap-2">{RESULTS.map((option) => <button key={option} type="button" disabled={!canFinalize || proof.isFinalized} onClick={() => setStatus(option)} className={cn('border px-2 py-3 text-[10px] font-bold uppercase', status === option ? 'border-[#f39200] bg-[#fff8ed]' : 'border-[#d8d5ce] bg-white', option === 'FAILED' && 'text-red-600')}>{status === option && <Check className="mx-auto mb-1 size-4 text-[#f39200]" aria-hidden />}{option.replaceAll('_', ' ')}</button>)}</div></div>
        {canFinalize && !proof.isFinalized && <div className="space-y-3">{status === 'PASSED_WITH_CONDITIONS' && <Field label="Conditions *"><textarea className={cn(INPUT, 'resize-none')} rows={2} value={conditions} onChange={(event) => setConditions(event.target.value)} /></Field>}{requiresNote && action === 'FINALIZE' && <Field label="Verification Note *"><textarea className={cn(INPUT, 'resize-none')} rows={3} value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Explain differences from Escort/Driver submission…" /></Field>}{action === 'REJECT_PROOF' && <Field label="Rejection Reason *"><textarea className={cn(INPUT, 'resize-none')} rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></Field>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setAction(action === 'FINALIZE' ? 'REJECT_PROOF' : 'FINALIZE')}>{action === 'FINALIZE' ? 'Reject Proof' : 'Back to Finalize'}</Button><Button type="button" disabled={isPending} onClick={handleFinalize} className="bg-[#f39200] font-bold uppercase text-white hover:bg-[#e08600]">{isPending ? 'Saving…' : action === 'FINALIZE' ? '✓ Finalize Record' : 'Reject Proof'}</Button></div></div>}{!canFinalize && <div className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Read-only view. Only Transport Specialist can verify or finalize this record.</div>}{proof.isFinalized && <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">This record is finalized and read-only.</div>}</section>
    </div>
  </div></div>
}
