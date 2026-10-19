import { useParams } from 'react-router-dom'
import { UpdateAuthorityReviewDialog } from '../components'

export default function AuthorityReviewPage() {
  const { submissionId: submissionIdParam } = useParams<{ submissionId: string }>()
  const submissionId = submissionIdParam

  if (!submissionId) {
    return <main className="p-6 text-sm text-red-700">Invalid authority submission ID.</main>
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center p-4 sm:p-8">
      <UpdateAuthorityReviewDialog submissionId={submissionId} defaultOpen />
    </main>
  )
}

