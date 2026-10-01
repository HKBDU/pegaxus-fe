import ImageViewer from '@/shared/components/file-viewer/ImageViewer'
import pdf from './assets/a.pdf'
import { PdfViewer } from './shared/components/file-viewer/PdfViewer'
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
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <h1>ImageViewer test</h1>
      <p style={{ margin: '12px 0 24px', color: '#555' }}>
        Click image. Try wheel/pinch zoom, swipe, keyboard, thumbnails, fullscreen, download.
      </p>
      <ImageViewer images={images} index={1} />
      <div className="mt-8 w-[600px] h-[720px]">
        <PdfViewer url={pdf} fileName="sample.pdf" />
      </div>
    </main>
  )
}
