import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react"
import mascot from "@/assets/mascot.png"
import { LoaderCircle, RotateCcw, Send } from "lucide-react"
import { useParams, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAssistantChat } from "../hooks/useAssistantChat"
import { formatAssistantMessage, shouldShowAssistantReferences } from "../formatMessage"
import { ReferenceLinks } from "./ReferenceLinks"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"

const prompts = [
  "What is the status of my latest booking?",
  "What documents are still missing?",
  "Where is my transport now?",
]

export function AssistantChatWidget() {
  const { bookingId } = useParams<{ bookingId?: string }>()
  const location = useLocation()
  const [open, setOpen] = useState(location.pathname === "/assistant")
  const [draft, setDraft] = useState("")
  const { messages, loading, error, send, retry } = useAssistantChat(bookingId)

  // Dragging state and refs
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    initialX: number
    initialY: number
    hasMoved: boolean
  } | null>(null)
  const wasDraggedRef = useRef(false)

  // Clamp position within viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        const btnSize = 56
        const padding = 12
        const maxX = Math.max(padding, window.innerWidth - btnSize - padding)
        const maxY = Math.max(padding, window.innerHeight - btnSize - padding)
        return {
          x: Math.min(Math.max(padding, prev.x), maxX),
          y: Math.min(Math.max(padding, prev.y), maxY),
        }
      })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const currentX = position ? position.x : rect.left
    const currentY = position ? position.y : rect.top

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      hasMoved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
      dragRef.current.hasMoved = true
      setIsDragging(true)
    }

    if (dragRef.current.hasMoved) {
      const btnSize = 56
      const padding = 12
      const newX = Math.max(padding, Math.min(window.innerWidth - btnSize - padding, dragRef.current.initialX + dx))
      const newY = Math.max(padding, Math.min(window.innerHeight - btnSize - padding, dragRef.current.initialY + dy))
      setPosition({ x: newX, y: newY })
    }
  }

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    if (dragRef.current.hasMoved) {
      wasDraggedRef.current = true
    }
    dragRef.current = null
    setIsDragging(false)
  }

  const handlePointerCancel = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    dragRef.current = null
    setIsDragging(false)
  }

  const handleClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    setOpen(true)
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || loading || text.length > 1000) return
    setDraft("")
    await send(text)
  }

  function keyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Open Pegaxus AI assistant"
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px`, right: "auto", bottom: "auto" }
            : { bottom: "1.25rem", right: "1.25rem" }
        }
        className={cn(
          "fixed z-40 flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-orange-300/80 bg-white",
          "shadow-[0_6px_22px_rgba(243,146,0,0.38)] hover:shadow-[0_10px_28px_rgba(243,146,0,0.52)] hover:border-orange-400",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 touch-none select-none",
          isDragging
            ? "cursor-grabbing scale-105 shadow-[0_12px_32px_rgba(243,146,0,0.6)]"
            : "cursor-grab hover:scale-105 transition-[transform,box-shadow,border-color] duration-150 motion-reduce:animate-none motion-reduce:transition-none"
        )}
      >
        <img
          src={mascot}
          alt=""
          draggable={false}
          className="size-full object-contain pointer-events-none select-none"
        />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          aria-describedby="assistant-description"
          className="assistant-sidebar w-full gap-0 overflow-hidden p-0 motion-reduce:transition-none sm:max-w-[440px]"
        >
          <SheetHeader className="flex-row items-center gap-3 border-b border-slate-200 pr-12">
            <img
              src={mascot}
              alt="Pegaxus AI mascot"
              className="size-11 shrink-0 rounded-full border border-orange-200 bg-orange-50 object-cover"
            />
            <div className="min-w-0">
              <SheetTitle>Pegaxus AI</SheetTitle>
              <SheetDescription id="assistant-description">
                Ask about your bookings, required documents, or transport progress.
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
            >
              {!messages.length ? (
                <div className="space-y-4 pt-3">
                  <p className="text-sm text-slate-600">
                    I can look up your bookings, dossier requirements, and transport updates.
                  </p>
                  {prompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => void send(p)}
                      disabled={loading}
                      className="mb-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-orange-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((m, i) => (
                  <article
                    key={m.createdAt + i}
                    className={
                      m.role === "user"
                        ? "ml-8 rounded-2xl bg-orange-500 px-3.5 py-3 text-sm text-white"
                        : "mr-3 assistant-message-enter rounded-2xl bg-slate-100 px-3.5 py-3 text-sm text-slate-800"
                    }
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {m.role === "model" ? formatAssistantMessage(m.content) : m.content}
                    </p>
                    {m.references?.length && shouldShowAssistantReferences(m.content) ? (
                      <ReferenceLinks references={m.references} />
                    ) : null}
                    <time
                      className="mt-2 block text-[10px] opacity-70"
                      dateTime={m.createdAt}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </article>
                ))
              )}
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
                  <LoaderCircle className="size-4 animate-spin" />
                  Checking your Pegaxus records...
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 p-4">
              {error ? (
                <div
                  className="mb-3 flex justify-between rounded bg-red-50 p-2 text-xs text-red-800"
                  role="alert"
                >
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => void retry()}
                    disabled={loading}
                    className="underline"
                  >
                    <RotateCcw className="inline size-3" /> Retry
                  </button>
                </div>
              ) : null}

              <form onSubmit={(e) => void submit(e)} className="flex items-end gap-2">
                <label htmlFor="assistant-message" className="sr-only">
                  Your message
                </label>
                <textarea
                  id="assistant-message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={keyDown}
                  maxLength={1000}
                  rows={2}
                  placeholder="Ask Pegaxus AI..."
                  disabled={loading}
                  className="min-h-11 flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={loading || !draft.trim() || draft.length > 1000}
                  aria-label="Send message"
                  className="flex size-11 items-center justify-center rounded-lg bg-[#f39200] text-white disabled:opacity-50"
                >
                  {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
              <p className="mt-1.5 text-right text-[10px] text-slate-500">
                {draft.length}/1000 | Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}



