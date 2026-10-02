import { useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { normalizeRole } from '@/features/auth/access-control'
import FileUploader from '@/shared/components/FileUploader'
import { Field } from '@/shared/components/Field'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { useUpdateAuthorityReview } from '../hooks'
import type { AuthorityDecision } from '../types'

const DECISION_FILE_TYPES = 'application/pdf,image/jpeg,image/png'
const MAX_DECISION_FILE_SIZE = 10 * 1024 * 1024

interface UpdateAuthorityReviewDialogProps {
  submissionId: number
  onUpdated?: () => void
}

const decisions: Array<{ value: AuthorityDecision; label: string; description: string }> = [
  { value: 'APPROVED', label: 'Approved', description: 'Authority approved the submission.' },
  { value: 'RETURNED', label: 'Returned', description: 'Additional information is required.' },
  { value: 'REJECTED', label: 'Rejected', description: 'Authority rejected the submission.' },
]

export function UpdateAuthorityReviewDialog({ submissionId, onUpdated }: UpdateAuthorityReviewDialogProps) {
  const roles = useAuthStore((state) => state.principal?.roles ?? [])
  const canUpdate = roles.some((role) => normalizeRole(role) === 'TRANSPORT_SPECIALIST')
  const mutation = useUpdateAuthorityReview(submissionId)
  const uploadedFiles = useRef(new Map<string, File>())
  const [uploadedId, setUploadedId] = useState('')
  const [open, setOpen] = useState(false)
  const [decision, setDecision] = useState<AuthorityDecision>('APPROVED')
  const [permitNumber, setPermitNumber] = useState('')
  const [permitIssuedDate, setPermitIssuedDate] = useState('')
  const [permitExpiryDate, setPermitExpiryDate] = useState('')
  const [revisionDueDate, setRevisionDueDate] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [error, setError] = useState('')

  if (!canUpdate) return null

  const decisionFile = uploadedFiles.current.get(uploadedId)

  const reset = () => {
    setDecision('APPROVED')
    setPermitNumber('')
    setPermitIssuedDate('')
    setPermitExpiryDate('')
    setRevisionDueDate('')
    setRejectionReason('')
    setDecisionNote('')
    setUploadedId('')
    uploadedFiles.current.clear()
    setError('')
    mutation.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!decisionFile) {
      setError('Please upload the official authority decision document.')
      return
    }
    if (decision === 'APPROVED' && !permitNumber.trim()) {
      setError('Permit Number is required when the authority approves the submission.')
      return
    }
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      setError('Rejection Reason is required when the authority rejects the submission.')
      return
    }
    if (decision === 'RETURNED' && !revisionDueDate) {
      setError('Revision Due Date is required when the submission is returned.')
      return
    }

    try {
      await mutation.mutateAsync({
        decision,
        permitNumber,
        permitIssuedDate,
        permitExpiryDate,
        decisionFile,
        decisionNote,
        rejectionReason,
        revisionDueDate,
      })
      onUpdated?.()
      setOpen(false)
      reset()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update the authority review result.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="bg-[#f39200] text-white hover:bg-[#d97f00]">
          Update Authority Review Result
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase text-[#f39200]">Update Authority Review Result</DialogTitle>
          <DialogDescription>
            Record the official authority decision for submission #{submissionId}.
          </DialogDescription>
        </DialogHeader>

        <form id="update-authority-review" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Review Outcome *">
            <div className="grid gap-2 sm:grid-cols-3">
              {decisions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDecision(option.value)}
                  className={`min-h-16 border px-3 py-2 text-left transition-colors ${decision === option.value ? 'border-[#f39200] bg-[#fff7eb]' : 'border-[#d9d9d9] bg-[#f4f4f4] hover:border-[#f39200]'}`}
                  aria-pressed={decision === option.value}
                >
                  <span className={`block text-[11px] font-bold uppercase ${option.value === 'REJECTED' ? 'text-red-600' : 'text-[#171717]'}`}>{option.label}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </Field>

          {decision === 'APPROVED' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Official Approval Code / Permit Number *">
                <Input value={permitNumber} onChange={(event) => setPermitNumber(event.target.value)} placeholder="EU-PERMIT-2026-881" />
              </Field>
              <Field label="Permit Issued Date">
                <DatePicker value={permitIssuedDate} onChange={setPermitIssuedDate} />
              </Field>
              <Field label="Permit Expiry Date">
                <DatePicker value={permitExpiryDate} onChange={setPermitExpiryDate} />
              </Field>
            </div>
          )}

          {decision === 'RETURNED' && (
            <Field label="Revision Due Date *">
              <DatePicker value={revisionDueDate} onChange={setRevisionDueDate} />
            </Field>
          )}

          {decision === 'REJECTED' && (
            <Field label="Rejection Reason *">
              <Textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Official reason provided by the authority" rows={3} />
            </Field>
          )}

          <Field label="Official Authority Decision Document *">
            <FileUploader
              entity="attachment"
              accept={DECISION_FILE_TYPES}
              maxSize={MAX_DECISION_FILE_SIZE}
              maxFiles={1}
              multiple={false}
              title="Upload authority decision document"
              hint="PDF, JPG, or PNG · up to 10 MB"
              onUploaded={({ publicId, file }) => uploadedFiles.current.set(publicId, file)}
              onChange={(ids) => setUploadedId(ids[0] ?? '')}
            />
          </Field>

          <Field label="Review Note">
            <Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Optional review note" rows={3} />
          </Field>

          {error && (
            <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </form>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="update-authority-review" className="bg-[#f39200] text-white hover:bg-[#d97f00]" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Save Review Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
