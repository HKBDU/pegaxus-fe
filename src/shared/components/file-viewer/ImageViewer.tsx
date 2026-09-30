import { memo, useEffect, useMemo, useRef, useState } from 'react'
import Lightbox, { type ControllerRef } from 'yet-another-react-lightbox'
import Inline from 'yet-another-react-lightbox/plugins/inline'
import DownloadPlugin from 'yet-another-react-lightbox/plugins/download'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import type { ImageViewerProps } from '@/shared/types/props'

const makeThumbConfig = (width: number, height: number) => ({
  thumbnails: {
    position: 'bottom' as const,
    width,
    height,
    gap: 6,
    border: 1,
    borderRadius: 4,
    padding: 0,
    vignette: false,
    showToggle: false,
  },
})

const THUMB_CONFIG = {
  small: makeThumbConfig(44, 32),
  large: makeThumbConfig(104, 76),
}

const PLUGINS_SINGLE = [Inline, Zoom, Fullscreen, DownloadPlugin]
const PLUGINS_MULTI = [...PLUGINS_SINGLE, Thumbnails]

const INLINE = { style: { width: '100%', height: '100%' } }
const ZOOM = { scrollToZoom: false, pinchZoomV4: true, maxZoomPixelRatio: 4 }
const TOOLBAR = { buttons: ['fullscreen', 'zoom', 'download'] as ['fullscreen', 'zoom', 'download'] }
const LABELS = { Previous: 'Previous image', Next: 'Next image' }

const ICONS = {
  iconEnterFullscreen: () => <Maximize size={20} aria-hidden="true" />,
  iconExitFullscreen: () => <Minimize size={20} aria-hidden="true" />,
  iconZoomIn: () => <ZoomIn size={20} aria-hidden="true" />,
  iconZoomOut: () => <ZoomOut size={20} aria-hidden="true" />,
  iconDownload: () => <Download size={20} aria-hidden="true" />,
}
const RENDER_MULTI = ICONS
const RENDER_SINGLE = { ...ICONS, buttonPrev: () => null, buttonNext: () => null }

const ROOT_CLASS =
  'image-viewer-root relative max-h-full max-w-full min-w-0 overflow-hidden bg-neutral-900 ' +
  '[--yarl__color_backdrop:#171717] [--yarl__color_button:#fff] [--yarl__color_button_active:#f39200]'

/**
 * Inline image viewer. It stays inside the caller-provided `width` and `height`.
 * - Toolbar stays in the top-right corner.
 * - Chevron toggles the thumbnail strip size.
 * - Fullscreen starts only from the fullscreen control.
 * - Arrow keys navigate while the pointer is over the viewer.
 */
function ImageViewer({
  images,
  index = 0,
  className,
  style,
  width = '100%',
  height = 400,
  ariaLabel = 'Image gallery',
}: ImageViewerProps) {
  const [expanded, setExpanded] = useState(false)

  const slides = useMemo(
    () => images.map((image) => (typeof image === 'string' ? { src: image } : image)),
    [images],
  )

  const multiple = slides.length > 1
  const safeIndex = Math.max(0, Math.min(index, Math.max(slides.length - 1, 0)))

  // Refs avoid renders for pointer movement and active-slide changes.
  const lightboxRef = useRef<ControllerRef>(null)
  const indexRef = useRef(safeIndex)
  const hoveredRef = useRef(false)

  // Keep plugin props stable between renders.
  const on = useMemo(
    () => ({ view: ({ index: i }: { index: number }) => { indexRef.current = i } }),
    [],
  )
  const controller = useMemo(() => ({ ref: lightboxRef, closeOnBackdropClick: false }), [])
  const carousel = useMemo(
    () => ({ finite: !multiple, padding: 0, spacing: 0, preload: 1 }),
    [multiple],
  )

  // Register one global listener and gate it with the hover ref.
  useEffect(() => {
    if (!multiple) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!hoveredRef.current || e.defaultPrevented) return
      const target = e.target as HTMLElement
      if (target.closest('.yarl__root')) return // Let the lightbox handle focused events.
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        lightboxRef.current?.prev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        lightboxRef.current?.next()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [multiple])

  if (!slides.length) {
    return (
      <div
        className={className ? `${ROOT_CLASS} ${className}` : ROOT_CLASS}
        aria-label={ariaLabel}
        style={{ width, height, ...style }}
      >
        <div className="flex size-full items-center justify-center text-sm text-white/70">
          No Image Found
        </div>
      </div>
    )
  }

  const { thumbnails } = expanded ? THUMB_CONFIG.large : THUMB_CONFIG.small

  return (
    <div
      className={className ? `${ROOT_CLASS} ${className}` : ROOT_CLASS}
      aria-label={ariaLabel}
      style={{ width, height, ...style }}
      onMouseEnter={() => { hoveredRef.current = true }}
      onMouseLeave={() => { hoveredRef.current = false }}
    >
      {/* Keep the lightbox inside the caller-sized frame. */}
      <div className="absolute inset-x-0 top-px bottom-0">
        <Lightbox
          plugins={multiple ? PLUGINS_MULTI : PLUGINS_SINGLE}
          inline={INLINE}
          slides={slides}
          index={indexRef.current}
          on={on}
          carousel={carousel}
          zoom={ZOOM}
          thumbnails={thumbnails}
          toolbar={TOOLBAR}
          controller={controller}
          render={multiple ? RENDER_MULTI : RENDER_SINGLE}
          labels={LABELS}
        />
      </div>

      {multiple && (
        <div
          className="absolute right-0 bottom-0 z-20 flex items-end px-1.5"
        >
          <Button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Shrink thumbnails' : 'Enlarge thumbnails'}
            aria-expanded={expanded}
            variant="ghost"
            size="icon-sm"
            className="bg-black/60 text-white hover:bg-black/60 hover:text-[#f39200] focus-visible:text-[#f39200]"
          >
            {expanded ? (
              <ChevronDown size={20} aria-hidden="true" />
            ) : (
              <ChevronUp size={20} aria-hidden="true" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export default memo(ImageViewer)
