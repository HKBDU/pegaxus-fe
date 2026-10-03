import { useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { normalizeRole } from '@/features/auth/access-control'
import FileUploader from '@/shared/components/FileUploader'
import { Field } from '@/shared/components/Field'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useUpdateAuthorityReview } from '../hooks'
import type { AuthorityDecision } from '../types'
import { AuthorityEvidencePreview } from './AuthorityEvidencePreview'

const FILE_TYPES = 'application/pdf,image/jpeg,image/png'
const MAX_FILE_SIZE = 5 * 1024 * 1024
type Errors = Partial<Record<'permitNumber' | 'decisionFile' | 'rejectionReason' | 'revisionDueDate', string>>
const DialogDescription = (_props: { children?: unknown }) => null
interface Props { submissionId: number; onUpdated?: () => void }
const decisions: Array<{ value: AuthorityDecision; label: string; description: string }> = [{ value: 'APPROVED', label: 'Approved', description: 'Authority approved the submission.' }, { value: 'RETURNED', label: 'Returned', description: 'Additional information is required.' }, { value: 'REJECTED', label: 'Rejected', description: 'Authority rejected the submission.' }]

export function UpdateAuthorityReviewDialog({ submissionId, onUpdated }: Props) {
  const roles = useAuthStore((state) => state.principal?.roles ?? [])
  const canUpdate = roles.some((role) => normalizeRole(role) === 'TRANSPORT_SPECIALIST')
  const mutation = useUpdateAuthorityReview(submissionId)
  const filesRef = useRef(new Map<string, File>())
  const [uploadedId, setUploadedId] = useState('')
  const [open, setOpen] = useState(false)
  const [decision, setDecision] = useState<AuthorityDecision>('APPROVED')
  const [permitNumber, setPermitNumber] = useState('')
  const [permitIssuedDate, setPermitIssuedDate] = useState('')
  const [permitExpiryDate, setPermitExpiryDate] = useState('')
  const [revisionDueDate, setRevisionDueDate] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const decisionFile = uploadedId ? filesRef.current.get(uploadedId) : undefined
  if (!canUpdate) return null

  const clearError = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }))
  const reset = () => { setDecision('APPROVED'); setPermitNumber(''); setPermitIssuedDate(''); setPermitExpiryDate(''); setRevisionDueDate(''); setRejectionReason(''); setDecisionNote(''); setUploadedId(''); filesRef.current.clear(); setErrors({}); setServerError(''); mutation.reset() }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({}); setServerError('')
    const next: Errors = {}
    if (!decisionFile) next.decisionFile = 'Official authority decision document is required.'
    if (decision === 'APPROVED' && !permitNumber.trim()) next.permitNumber = 'Permit Number is required.'
    if (decision === 'REJECTED' && !rejectionReason.trim()) next.rejectionReason = 'Rejection Reason is required.'
    if (decision === 'RETURNED' && !revisionDueDate) next.revisionDueDate = 'Revision Due Date is required.'
    if (Object.keys(next).length) return setErrors(next)
    try { await mutation.mutateAsync({ decision, permitNumber, permitIssuedDate, permitExpiryDate, decisionFile: decisionFile!, decisionNote, rejectionReason, revisionDueDate }); onUpdated?.(); setOpen(false); reset() } catch (error) { setServerError(error instanceof Error ? error.message : 'Unable to update the authority review result.') }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset() }}><DialogTrigger asChild><Button type="button" className="bg-[#f39200] text-white hover:bg-[#d97f00]">Update Authority Review Result</Button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle className="font-heading uppercase text-[#f39200]">Update Authority Review Result</DialogTitle><DialogDescription>Record the official authority decision for submission #{submissionId}.</DialogDescription></DialogHeader><form id="update-authority-review" onSubmit={submit} className="space-y-5"><Field label="Review Outcome *"><div className="grid gap-2 sm:grid-cols-3">{decisions.map((option) => <button key={option.value} type="button" onClick={() => setDecision(option.value)} className={`min-h-16 border px-3 py-2 text-left transition-colors ${decision === option.value ? 'border-[#f39200] bg-[#fff7eb]' : 'border-[#d9d9d9] bg-[#f4f4f4] hover:border-[#f39200]'}`} aria-pressed={decision === option.value}><span className={`block text-[11px] font-bold uppercase ${option.value === 'REJECTED' ? 'text-red-600' : 'text-[#171717]'}`}>{option.label}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{option.description}</span></button>)}</div></Field>{decision === 'APPROVED' && <div className="space-y-4"><Field label="Official Approval Code / Permit Number *" error={errors.permitNumber}><Input className={errors.permitNumber ? 'border-red-500 focus-visible:ring-red-500' : ''} value={permitNumber} onChange={(event) => { setPermitNumber(event.target.value); clearError('permitNumber') }} placeholder="EU-PERMIT-2026-881" /></Field><Field label="Permit Issued Date"><DatePicker value={permitIssuedDate} onChange={setPermitIssuedDate} /></Field><Field label="Permit Expiry Date"><DatePicker value={permitExpiryDate} onChange={setPermitExpiryDate} /></Field></div>}{decision === 'RETURNED' && <Field label="Revision Due Date *" error={errors.revisionDueDate}><DatePicker className={errors.revisionDueDate ? 'border-red-500' : ''} value={revisionDueDate} onChange={(value) => { setRevisionDueDate(value); clearError('revisionDueDate') }} /></Field>}{decision === 'REJECTED' && <Field label="Rejection Reason *" error={errors.rejectionReason}><Textarea className={errors.rejectionReason ? 'border-red-500 focus-visible:ring-red-500' : ''} value={rejectionReason} onChange={(event) => { setRejectionReason(event.target.value); clearError('rejectionReason') }} placeholder="Official reason provided by the authority" rows={3} /></Field>}<Field label="Official Authority Decision Document *" error={errors.decisionFile}><div className={errors.decisionFile ? 'rounded border border-red-500 p-1' : ''}><FileUploader entity="attachment" accept={FILE_TYPES} maxSize={MAX_FILE_SIZE} maxFiles={1} multiple={false} title="Upload authority decision document" hint="PDF, JPG, or PNG · up to 5 MB" onUploaded={({ publicId, file }) => filesRef.current.set(publicId, file)} onChange={(ids) => { setUploadedId(ids[0] ?? ''); if (ids.length) clearError('decisionFile') }} /></div><AuthorityEvidencePreview files={decisionFile ? [decisionFile] : []} /></Field><Field label="Review Note"><Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Optional review note" rows={3} /></Field></form><DialogFooter className="gap-2 sm:justify-end">{serverError && <TooltipProvider><Tooltip><TooltipTrigger asChild><span className="cursor-help text-red-600"><AlertCircle className="size-5" aria-label="Review error" /></span></TooltipTrigger><TooltipContent>{serverError}</TooltipContent></Tooltip></TooltipProvider>}<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="update-authority-review" className="bg-[#f39200] text-white hover:bg-[#d97f00]" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}Save Review Result</Button></DialogFooter></DialogContent></Dialog>
}
