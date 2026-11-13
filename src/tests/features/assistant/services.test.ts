import { beforeEach, describe, expect, it, vi } from "vitest"
const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/axios", () => ({ default: { post } }))
import { getAssistantErrorCode, sendAssistantMessage } from "@/features/assistant/services"

describe("assistant service", () => {
  beforeEach(() => post.mockReset())

  it("parses the payload unwrapped by the API client and posts only chat messages", async () => {
    post.mockResolvedValue({ value: { reply: "Your booking is approved.", references: [] } })
    await expect(sendAssistantMessage({ messages: [{ role: "user", content: "status?" }] }))
      .resolves.toEqual({ reply: "Your booking is approved.", references: [] })
    expect(post).toHaveBeenCalledWith("assistant/chat", { messages: [{ role: "user", content: "status?" }] }, { signal: undefined })
  })

  it("keeps the assistant reply when a backend Guid has non-RFC version bits", async () => {
    const reply = "You have four bookings."
    const id = "53ccf00e-c9b5-ad5c-a760-a94dc6147e86"
    post.mockResolvedValue({
      value: {
        reply,
        references: [{ type: "booking", id, label: "REQ-20261010-DEMO-0006", updatedAt: "2026-10-15T14:21:28.137877+00:00", bookingId: null }],
      },
    })

    await expect(sendAssistantMessage({ messages: [{ role: "user", content: "How many bookings?" }] }))
      .resolves.toMatchObject({ reply, references: [{ id }] })
  })
  it("rejects invalid history before sending", async () => {
    await expect(sendAssistantMessage({
      messages: Array.from({ length: 21 }, () => ({ role: "user" as const, content: "hi" })),
    })).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it.each([
    [{ response: { status: 401, data: { errorCode: "UNAUTHORIZED" } } }, "UNAUTHORIZED"],
    [{ response: { status: 403, data: { errorCode: "FORBIDDEN" } } }, "FORBIDDEN"],
    [{ response: { status: 429, data: { errorCode: "TOO_MANY_REQUESTS" } } }, "TOO_MANY_REQUESTS"],
    [{ response: { status: 502, data: { errorCode: "GEMINI_UNAVAILABLE" } } }, "GEMINI_UNAVAILABLE"],
    [{ response: { status: 504, data: { errorCode: "GEMINI_UNAVAILABLE" } } }, "GEMINI_TIMEOUT"],
    [{ message: "network down" }, "ASSISTANT_ERROR"],
  ])("maps provider errors", (cause, expectedCode) => {
    expect(getAssistantErrorCode(cause)).toBe(expectedCode)
  })
})