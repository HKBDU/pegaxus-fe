import { UploadedProofPreview } from '@/shared/components/file-viewer/UploadedProofPreview'

export function AuthorityEvidencePreview({ files }: { files: File[] }) {
  return <UploadedProofPreview files={files} />
}

