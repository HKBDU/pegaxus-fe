import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import ImageViewer from "@/shared/components/file-viewer/ImageViewer"
import { PdfViewer } from "@/shared/components/file-viewer/PdfViewer"

export type UploadedPreviewItem =
  | File
  | {
      name: string
      url: string
      size?: number
      type?: string
    }

export interface UploadedProofPreviewProps {
  files: UploadedPreviewItem[]
  label?: string
  height?: number | string
  className?: string
}

/**
 * Standardized preview panel for uploaded proofs and receipts.
 * Renders the reference container with the uppercase title, inline ImageViewer
 * with zoom/download/fullscreen toolbar, and PdfViewer for document files.
 */
export function UploadedProofPreview({
  files,
  label = "Uploaded proof preview",
  height = 280,
  className,
}: UploadedProofPreviewProps) {
  const [previews, setPreviews] = useState<
    { name: string; size?: number; type: string; url: string; isBlob: boolean }[]
  >([])

  useEffect(() => {
    const next = files.map((item) => {
      if (item instanceof File) {
        return {
          name: item.name,
          size: item.size,
          type: item.type,
          url: URL.createObjectURL(item),
          isBlob: true,
        }
      }
      return {
        name: item.name,
        size: item.size,
        type: item.type ?? "",
        url: item.url,
        isBlob: false,
      }
    })
    setPreviews(next)
    return () => {
      next.forEach((item) => {
        if (item.isBlob) URL.revokeObjectURL(item.url)
      })
    }
  }, [files])

  if (!previews.length) return null

  const images = previews.filter(
    (item) =>
      item.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif)$/i.test(item.name),
  )
  const pdfs = previews.filter(
    (item) => item.type === "application/pdf" || /\.pdf$/i.test(item.name),
  )

  return (
    <div
      className={cn(
        "space-y-3 border border-[#d8d5ce] bg-[#f8f8f8] p-3",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6c6963]">
        {label}
      </p>
      {images.length > 0 && (
        <ImageViewer
          images={images.map((img) => ({
            src: img.url,
            size: img.size,
            title: img.name,
            alt: img.name,
          }))}
          height={height}
          width="100%"
        />
      )}
      {pdfs.map((pdf) => (
        <PdfViewer
          key={pdf.url}
          url={pdf.url}
          fileName={pdf.name}
          size={pdf.size}
        />
      ))}
    </div>
  )
}

