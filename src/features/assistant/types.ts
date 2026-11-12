export type AssistantRole = "user" | "model"
export interface AssistantMessage { role: AssistantRole; content: string; createdAt: string; references?: AssistantReference[] }
export interface AssistantRequest { messages: Array<Pick<AssistantMessage, "role" | "content">>; bookingId?: string }
export interface AssistantReference { type: "booking" | "dossier" | "tracking"; id: string; label: string; updatedAt: string | null; bookingId?: string | null }
export interface AssistantReply { reply: string; references: AssistantReference[] }
