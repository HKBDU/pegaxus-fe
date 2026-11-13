import { useParams } from 'react-router-dom'
import { UpdateAuthorityReviewDialog } from '../components'

export default function AuthorityReviewPage() {
  const { dossierId: dossierIdParam, submissionId: submissionIdParam } = useParams<{ dossierId: string; submissionId: string }>()
  const dossierId = dossierIdParam
  const submissionId = submissionIdParam

  if (!dossierId || !submissionId) {
    return <main className="p-6 text-sm text-red-700">Invalid authority submission or dossier ID.</main>
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center p-4 sm:p-8">
      <UpdateAuthorityReviewDialog dossierId={dossierId} submissionId={submissionId} defaultOpen />
    </main>
  )
}

