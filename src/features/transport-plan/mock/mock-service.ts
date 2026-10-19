import { createFlow3MockStore } from "./mock-store";

// One in-memory store per SPA session, shared by AB/TP/RP. Refresh resets it.
export const flow3MockService = createFlow3MockStore();
