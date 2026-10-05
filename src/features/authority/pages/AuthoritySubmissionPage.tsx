import { useParams } from 'react-router-dom'
import { RecordAuthoritySubmissionDialog } from '../components'

export default function AuthoritySubmissionPage() {
  const { dossierId: dossierIdParam } = useParams<{ dossierId: string }>()
  const dossierId = dossierIdParam ? Number(dossierIdParam) : NaN

  if (!Number.isFinite(dossierId)) {
    return <main className="p-6 text-sm text-red-700">Invalid ComplianceDossier ID.</main>
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center p-4 sm:p-8">
      <RecordAuthoritySubmissionDialog dossierId={dossierId} />
    </main>
  )
}
