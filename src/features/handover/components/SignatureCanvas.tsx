import { Eraser, PenLine } from "lucide-react"
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { drawStrokes, hasSignature, INK, PAD_RATIO, type SignatureTone } from "../signature"
import type { SignatureStroke } from "../types"

interface Props {
  id: string
  label: string
  /** Who signs, shown under the label. */
  signer?: string
  tone: SignatureTone
  strokes: SignatureStroke[]
  onChange: (strokes: SignatureStroke[]) => void
  disabled?: boolean
  error?: string
}

const TONE_CLASS: Record<SignatureTone, { chip: string; ring: string; hint: string }> = {
  sender: { chip: "bg-blue-50 text-blue-700 ring-blue-200", ring: "border-blue-300 focus-within:ring-blue-300/50", hint: "text-blue-700" },
  receiver: { chip: "bg-orange-50 text-orange-700 ring-orange-200", ring: "border-orange-300 focus-within:ring-orange-300/50", hint: "text-orange-700" },
}

/**
 * Handwritten signature pad. Pointer Events cover finger, stylus and mouse with one code path; `touch-none`
 * (touch-action: none) stops the page from scrolling or zooming while the customer signs on the driver's phone.
 * The pad keeps its 2:1 shape at any width (Tailwind `aspect-[2/1]`), and strokes are stored as fractions of it.
 */
export function SignatureCanvas({ id, label, signer, tone, strokes, onChange, disabled = false, error }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const strokesRef = useRef(strokes)
  const activeRef = useRef<{ pointerId: number; stroke: SignatureStroke } | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const color = INK[tone]
  const signed = hasSignature(strokes)

  const redraw = useCallback(
    (list: SignatureStroke[]) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      const { width, height } = sizeRef.current
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ratio = canvas.width / (width || 1)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawStrokes(ctx, list, width, height, color)
    },
    [color],
  )

  // Keep the drawing buffer sharp on high-DPI screens and redraw whenever the pad is resized or rotated.
  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return
    const fit = () => {
      const rect = frame.getBoundingClientRect()
      if (rect.width === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      sizeRef.current = { width: rect.width, height: rect.width / PAD_RATIO }
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round((rect.width / PAD_RATIO) * dpr)
      redraw(strokesRef.current)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [redraw])

  useEffect(() => {
    strokesRef.current = strokes
    if (!activeRef.current) redraw(strokes)
  }, [strokes, redraw])

  const point = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return { x: 0, y: 0 }
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || activeRef.current) return
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activeRef.current = { pointerId: event.pointerId, stroke: [point(event)] }
    redraw([...strokesRef.current, activeRef.current.stroke])
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    // Coalesced events keep fast finger strokes smooth instead of drawing straight segments.
    const samples = typeof event.nativeEvent.getCoalescedEvents === "function" ? event.nativeEvent.getCoalescedEvents() : []
    for (const sample of samples.length > 0 ? samples : [event.nativeEvent]) active.stroke.push(point(sample))
    redraw([...strokesRef.current, active.stroke])
  }

  const finish = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) return
    activeRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const next = [...strokesRef.current, active.stroke]
    strokesRef.current = next
    onChange(next)
  }

  const clear = () => {
    activeRef.current = null
    strokesRef.current = []
    redraw([])
    onChange([])
  }

  const styles = TONE_CLASS[tone]

  return (
    <div className="min-w-0 space-y-2" data-signature-pad={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p id={`${id}-label`} className="font-heading text-xs font-semibold tracking-wide text-gray-800 uppercase">
            {label} <span className="text-red-600" aria-hidden="true">*</span>
          </p>
          {signer ? <p className="truncate text-xs text-gray-500">{signer}</p> : null}
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", signed ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : styles.chip)}>
          <PenLine aria-hidden="true" className="size-3" />
          {signed ? "Signed" : "Not signed"}
        </span>
      </div>

      <div
        ref={frameRef}
        className={cn(
          "relative aspect-[2/1] w-full overflow-hidden rounded-md border-2 border-dashed bg-white shadow-inner focus-within:ring-4",
          styles.ring,
          error && "border-red-400",
          disabled && "opacity-60",
        )}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("absolute inset-0 size-full touch-none select-none", disabled ? "cursor-not-allowed" : "cursor-crosshair")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onContextMenu={(event) => event.preventDefault()}
        />
        {strokes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <PenLine aria-hidden="true" className={cn("size-6 opacity-50", styles.hint)} />
            <p className="text-sm text-gray-400">Sign here with your finger or mouse</p>
          </div>
        ) : null}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-gray-300" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p id={`${id}-error`} role={error ? "alert" : undefined} className="min-w-0 text-xs text-red-600">
          {error}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={disabled || strokes.length === 0} className="min-h-11 shrink-0 gap-1.5 rounded-[2px] px-4 sm:min-h-8">
          <Eraser aria-hidden="true" className="size-4" />
          Clear to re-sign
        </Button>
      </div>
    </div>
  )
}
