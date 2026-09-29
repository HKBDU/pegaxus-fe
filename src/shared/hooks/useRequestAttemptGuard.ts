import { useState } from "react";
import { createRequestAttemptGuard, type RequestAttemptState } from "./request-attempt-guard";

export function useRequestAttemptGuard() {
  const [state, setState] = useState<RequestAttemptState>({ isRunning: false, isBlocked: false });
  const [guard] = useState(() => createRequestAttemptGuard(setState));
  return { ...state, run: guard.run, reset: guard.reset };
}
