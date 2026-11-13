import { useEffect, useState } from 'react'
import ImageViewer from '@/shared/components/file-viewer/ImageViewer'
import { PdfViewer } from '@/shared/components/file-viewer/PdfViewer'

export function AuthorityEvidencePreview({ files }: { files: File[] }) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPreviews(next)
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url))
  }, [files])
  const images = previews.filter(({ file }) => file.type.startsWith('image/'))
  const pdfs = previews.filter(({ file }) => file.type === 'application/pdf')
  if (!previews.length) return null
  return <div className="space-y-3 border border-[#d8d5ce] bg-[#f8f8f8] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#6c6963]">Uploaded proof preview</p>{images.length > 0 && <ImageViewer images={images.map(({ file, url }) => ({ src: url, size: file.size, title: file.name, alt: file.name }))} height={280} width="100%" />}{pdfs.map(({ file, url }) => <PdfViewer key={url} url={url} fileName={file.name} size={file.size} />)}</div>
}
