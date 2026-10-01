import { useState } from 'react'
import ImageViewer from '@/shared/components/file-viewer/ImageViewer'
import {
  isPresignedUploadError,
  presignedUpload,
  type PresignedUploadProgress,
} from '@/shared/utils/presigned'

import pdf from './assets/a.pdf'
import { PdfViewer } from './shared/components/file-viewer/PdfViewer'
import FileUploader from './shared/components/FileUploader'
const images = [
  {
    src: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1800&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=480&q=75',
    alt: 'Horse running in a field',
    title: 'Free running',
  },{
    src: 'https://images.unsplash.com/photo-1534773728080-33d31da27ae5?auto=format&fit=crop&w=1800&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1534773728080-33d31da27ae5?auto=format&fit=crop&w=480&q=75',
    alt: 'Horse portrait',
    title: 'Portrait',
  },
  {
    src: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?auto=format&fit=crop&w=1800&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?auto=format&fit=crop&w=480&q=75',
    alt: 'Horse in stable',
    title: 'In the stable',
  },
  {
    src: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?auto=format&fit=crop&w=1800&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?auto=format&fit=crop&w=480&q=75',
    alt: 'Horse in stable',
    title: 'In the stable',
  }
]

export default function Test() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<PresignedUploadProgress>()
  const [publicId, setPublicId] = useState<string>()
  const [error, setError] = useState<string>()
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload() {
    if (!file || isUploading) return

    setIsUploading(true)
    setPublicId(undefined)
    setError(undefined)
    setProgress(undefined)

    try {
      const uploadedPublicId = await presignedUpload.upload({
        file,
        entity: 'attachment',
        onProgress: setProgress,
      })
      setPublicId(uploadedPublicId)
    } catch (uploadError) {
      setError(
        isPresignedUploadError(uploadError)
          ? `${uploadError.code}${uploadError.status ? ` (HTTP ${uploadError.status})` : ''}`
          : uploadError instanceof Error ? uploadError.message : 'Upload failed',
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <h1>ImageViewer test</h1>
      <p style={{ margin: '12px 0 24px', color: '#555' }}>
        Click image. Try wheel/pinch zoom, swipe, keyboard, thumbnails, fullscreen, download.
      </p>
      <ImageViewer images={images} index={1} />
      <div className="mt-8 w-[600px] h-[720px]">
        <PdfViewer url={pdf} fileName="PDF Previewer" />
      </div>
<FileUploader ></FileUploader>
      <section style={{ marginTop: 32, padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Cloudinary presigned upload test</h2>
        <p style={{ margin: '8px 0 16px', color: '#555' }}>
          Backend: <code>POST /uploads/signature</code> → Cloudinary → <code>POST /uploads/confirm</code>
        </p>
        <input
          type="file"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null)
            setPublicId(undefined)
            setError(undefined)
            setProgress(undefined)
          }}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{ display: 'block', marginTop: 12, padding: '8px 16px', cursor: file && !isUploading ? 'pointer' : 'not-allowed' }}
        >
          {isUploading ? 'Uploading…' : 'Upload to Cloudinary'}
        </button>
        {file && <p style={{ marginTop: 12 }}>Selected: {file.name} ({file.size.toLocaleString()} bytes)</p>}
        {progress && <p>Progress: {progress.stage} ({progress.percent}%)</p>}
        {publicId && (
          <p style={{ color: 'green', overflowWrap: 'anywhere' }}>
            Upload confirmed. publicId: <code>{publicId}</code>
          </p>
        )}
        {error && <p style={{ color: 'crimson' }}>Upload error: {error}</p>}
      </section>
    </main>
  )
}
