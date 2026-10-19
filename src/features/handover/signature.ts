import { SIGNATURE_MAX_BYTES } from "./constants"
import type { SignatureStroke } from "./types"

/** The pad is always 2:1, so strokes stored as fractions of its width and height survive resizing and rotating the phone. */
export const PAD_RATIO = 2

/** Export sizes, biggest first. The contract asks for at least 300 x 150 and at most 200 KB. */
const EXPORT_WIDTHS = [900, 600, 450, 300] as const

export const INK = {
  sender: "#1d4ed8",
  receiver: "#c2410c",
} as const
export type SignatureTone = keyof typeof INK

/** Pen thickness follows the pad width, so a small phone pad and the exported image look alike. */
const penWidth = (width: number) => Math.max(2, width * 0.006)

export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SignatureStroke[], width: number, height: number, color: string) {
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = penWidth(width)
  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    if (stroke.length === 1) {
      ctx.beginPath()
      ctx.arc(stroke[0].x * width, stroke[0].y * height, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(stroke[0].x * width, stroke[0].y * height)
    // Quadratic curves through the midpoints give a smooth line instead of a polyline.
    for (let index = 1; index < stroke.length - 1; index += 1) {
      const midX = ((stroke[index].x + stroke[index + 1].x) / 2) * width
      const midY = ((stroke[index].y + stroke[index + 1].y) / 2) * height
      ctx.quadraticCurveTo(stroke[index].x * width, stroke[index].y * height, midX, midY)
    }
    const last = stroke[stroke.length - 1]
    ctx.lineTo(last.x * width, last.y * height)
    ctx.stroke()
  }
}

/** A signature needs some real ink: a stray tap or a tiny scratch does not count. */
export function hasSignature(strokes: SignatureStroke[]) {
  let points = 0
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  for (const stroke of strokes) {
    for (const point of stroke) {
      points += 1
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }
  }
  if (points < 6) return false
  return maxX - minX > 0.06 || (maxY - minY) * 0.5 > 0.06
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
}

/** Renders the strokes into a PNG (white background, so it prints and previews the same everywhere) of at most 200 KB. */
export async function strokesToPng(strokes: SignatureStroke[], color: string): Promise<Blob> {
  for (const width of EXPORT_WIDTHS) {
    const height = width / PAD_RATIO
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas is not supported on this device.")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    drawStrokes(ctx, strokes, width, height, color)
    const blob = await toBlob(canvas)
    if (blob && blob.size <= SIGNATURE_MAX_BYTES) return blob
  }
  throw new Error("The signature image is too large. Clear it and sign again with fewer strokes.")
}
