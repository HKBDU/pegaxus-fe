import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '../ui/button'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { Input } from '../ui/input'
import {
  VIEWER_MAX_ZOOM,
  VIEWER_MIN_ZOOM,
  VIEWER_WHEEL_SENSITIVITY,
  VIEWER_ZOOM_STEP,
} from '@/shared/constants/viewer'

// Configure the PDF.js worker once.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  fileName?: string
}

const clampZoom = (value: number) =>
  Math.min(Math.max(value, VIEWER_MIN_ZOOM), VIEWER_MAX_ZOOM)

export function PdfViewer({
  url,
  fileName = 'document.pdf',
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const scaleRef = useRef(1)

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [scale, setScale] = useState(1)
  const [pageWidth, setPageWidth] = useState<number | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const handleDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages)
      setCurrentPage(1)
      setPageInput('1')
    },
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePages = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visiblePages.length === 0) return

        const pageElement = visiblePages[0].target as HTMLElement
        const pageNumber = Number(pageElement.dataset.pageNumber)

        if (!Number.isNaN(pageNumber)) {
          setCurrentPage(pageNumber)
          setPageInput(String(pageNumber))
        }
      },
      { root: container, threshold: [0.25, 0.5, 0.75, 1] },
    )

    pageRefs.current.forEach((page) => {
      if (page) observer.observe(page)
    })

    return () => observer.disconnect()
  }, [numPages])

  /** Keep page width tied to the parent, not PDF content. */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => {
      const next = Math.max(container.clientWidth - 32, 100)
      setPageWidth((prev) => (prev === next ? prev : next))
    }

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(container)
    update()

    return () => resizeObserver.disconnect()
  }, [])

  /** Zoom with Ctrl/Cmd + wheel and keep the pointer anchored. */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = 0
    let pendingFactor = 1
    let anchor = { x: 0, y: 0 }

    const applyZoom = () => {
      rafId = 0

      const oldScale = scaleRef.current
      const newScale = clampZoom(oldScale * pendingFactor)
      pendingFactor = 1

      if (newScale === oldScale) return

      const ratio = newScale / oldScale
      const { scrollLeft, scrollTop } = container

      scaleRef.current = newScale
      flushSync(() => setScale(newScale))

      container.scrollLeft = (scrollLeft + anchor.x) * ratio - anchor.x
      container.scrollTop = (scrollTop + anchor.y) * ratio - anchor.y
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return

      event.preventDefault()

      const rect = container.getBoundingClientRect()
      anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      pendingFactor *= Math.exp(-event.deltaY * VIEWER_WHEEL_SENSITIVITY)

      if (!rafId) rafId = requestAnimationFrame(applyZoom)
    }

    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', onWheel)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  /** Pan the PDF with right-click drag. */
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 2) return

    const container = containerRef.current
    if (!container) return

    event.preventDefault()

    const startX = event.clientX
    const startY = event.clientY
    const startLeft = container.scrollLeft
    const startTop = container.scrollTop

    setIsPanning(true)

    const onMove = (e: MouseEvent) => {
      container.scrollLeft = startLeft - (e.clientX - startX)
      container.scrollTop = startTop - (e.clientY - startY)
    }

    const onUp = () => {
      setIsPanning(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const goToPage = useCallback(
    (page: number) => {
      const targetPage = Math.min(Math.max(page, 1), numPages)
      const element = pageRefs.current[targetPage - 1]
      if (!element) return

      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentPage(targetPage)
      setPageInput(String(targetPage))
    },
    [numPages],
  )

  const handlePageInputChange = (value: string) => {
    if (value === '') {
      setPageInput('')
      return
    }
    if (!/^\d+$/.test(value)) return
    setPageInput(value)
  }

  const handlePageInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== 'Enter') return

    const page = Number(pageInput)
    if (Number.isNaN(page)) {
      setPageInput(String(currentPage))
      return
    }
    goToPage(page)
  }

  const fitToWidth = () => setScale(1)

  const changeZoom = (amount: number) => {
    setScale((value) => {
      const next = clampZoom(value + amount)
      scaleRef.current = next
      return next
    })
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
  }

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full max-h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border bg-background">
      {/* Toolbar */}
      <div className="flex min-h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={fileName}>
            {fileName}
          </p>
        </div>

        <div className="flex min-w-0 max-w-full shrink items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-1">
            <Input
              value={pageInput}
              onChange={(event) =>
                handlePageInputChange(event.target.value)
              }
              onKeyDown={handlePageInputKeyDown}
              className="h-8 max-w-10 w-auto px-2 text-center"
              inputMode="numeric"
              aria-label="Current page"
            />
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              / {numPages || '—'}
            </span>
          </div>

          <div className="mx-1 h-5 w-px shrink-0 bg-border" />

          <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0"
            onClick={fitToWidth}
          >
            Fit
          </Button>

          <div className="mx-1 h-5 w-px shrink-0 bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={handleDownload}
            aria-label="Download PDF"
          >
            <Download />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={handleOpenInNewTab}
            aria-label="Open PDF in new tab"
          >
            <ExternalLink />
          </Button>
        </div>
      </div>

      {/* Keep overflow inside the parent viewport. */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onContextMenu={(event) => event.preventDefault()}
        className={`min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isPanning ? 'cursor-grabbing select-none' : ''
        }`}
      >
        <Document
          file={url}
          onLoadSuccess={handleDocumentLoadSuccess}
          loading={
            <div className="flex min-h-full items-center justify-center p-8 text-sm text-muted-foreground">
              Loading PDF...
            </div>
          }
          error={
            <div className="flex min-h-full items-center justify-center p-8 text-sm text-destructive">
              Failed to load PDF.
            </div>
          }
        >
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
            {Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1

              return (
                <div
                  key={pageNumber}
                  ref={(element) => {
                    pageRefs.current[index] = element
                  }}
                  data-page-number={pageNumber}
                  className="shrink-0 shadow-md"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth ?? undefined}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </div>
              )
            })}
          </div>
        </Document>
      </div>
    </div>
  )
}
