import { useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { normalizeRole } from '@/features/auth/access-control'
import { useRecordAuthoritySubmission } from '../hooks'
import type { AuthoritySubmissionStatus } from '../types'
import FileUploader from '@/shared/components/FileUploader'
import { Field } from '@/shared/components/Field'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'

const ACCEPTED_PROOF_TYPES = 'application/pdf,image/jpeg,image/png'
const MAX_PROOF_SIZE = 10 * 1024 * 1024

interface RecordAuthoritySubmissionDialogProps {
  dossierId: number
  dossierStatus?: AuthoritySubmissionStatus | string | null
  onRecorded?: () => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function RecordAuthoritySubmissionDialog({ dossierId, dossierStatus, onRecorded }: RecordAuthoritySubmissionDialogProps) {
  const roles = useAuthStore((state) => state.principal?.roles ?? [])
  const canSubmit = roles.some((role) => normalizeRole(role) === 'TRANSPORT_SPECIALIST')
  const canRecordForStatus = !dossierStatus || ['READY_FOR_SUBMISSION', 'SUBMITTED', 'PENDING'].includes(dossierStatus)
  const mutation = useRecordAuthoritySubmission(dossierId)
  const uploadedFiles = useRef(new Map<string, File>())
  const [uploadedIds, setUploadedIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [authorityName, setAuthorityName] = useState('')
  const [submissionReference, setSubmissionReference] = useState('')
  const [submissionDate, setSubmissionDate] = useState(today())
  const [decisionNote, setDecisionNote] = useState('')
  const [error, setError] = useState('')

  const proofFiles = useMemo(
    () => uploadedIds.flatMap((id) => {
      const file = uploadedFiles.current.get(id)
      return file ? [file] : []
    }),
    [uploadedIds],
  )

  if (!canSubmit) return null

  const reset = () => {
    setAuthorityName('')
    setSubmissionReference('')
    setSubmissionDate(today())
    setDecisionNote('')
    setUploadedIds([])
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
    if (!canRecordForStatus) {
      setError('This ComplianceDossier is not ready for an authority submission.')
      return
    }
    if (!authorityName.trim() || !submissionReference.trim() || !submissionDate || proofFiles.length === 0) {
      setError('Authority Portal, Submission Reference, Submission Date, and at least one Proof file are required.')
      return
    }

    try {
      await mutation.mutateAsync({
        authorityName,
        submissionReference,
        submittedAt: `${submissionDate}T00:00:00.000Z`,
        isRequired: true,
        proofFiles,
        decisionNote,
      })
      onRecorded?.()
      setOpen(false)
      reset()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record the authority submission.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="bg-[#f39200] text-white hover:bg-[#d97f00]">
          Record Authority Submission
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase text-[#f39200]">Record Authority Submission</DialogTitle>
          <DialogDescription>
            Record the external authority submission for ComplianceDossier #{dossierId}.
          </DialogDescription>
        </DialogHeader>

        <form id="record-authority-submission" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Authority Portal *">
              <Input value={authorityName} onChange={(event) => setAuthorityName(event.target.value)} placeholder="TRACES-NT, APHA IPAFFS, CDS" />
            </Field>
            <Field label="Submission Reference *">
              <Input value={submissionReference} onChange={(event) => setSubmissionReference(event.target.value)} placeholder="CHED-A / MRN reference" />
            </Field>
          </div>

          <Field label="Submission Date *">
            <DatePicker value={submissionDate} onChange={setSubmissionDate} />
          </Field>

          <Field label="Proof *">
            <FileUploader
              entity="attachment"
              accept={ACCEPTED_PROOF_TYPES}
              maxSize={MAX_PROOF_SIZE}
              maxFiles={10}
              multiple
              title="Upload submission receipt"
              hint="PDF, JPG, or PNG · up to 10 MB per file · multiple files supported"
              onUploaded={({ publicId, file }) => uploadedFiles.current.set(publicId, file)}
              onChange={setUploadedIds}
            />
          </Field>

          <Field label="Additional Note">
            <Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Optional note about the authority submission" rows={3} />
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
          <Button type="submit" form="record-authority-submission" className="bg-[#f39200] text-white hover:bg-[#d97f00]" disabled={mutation.isPending || !canRecordForStatus}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Confirm Submission Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
