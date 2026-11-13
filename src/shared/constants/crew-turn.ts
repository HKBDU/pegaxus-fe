/** BE refuses a crew whose segment is not the one in progress: they handed the horses over, or have not received them yet. */
export const NOT_CURRENT_SEGMENT_CREW = "NOT_CURRENT_SEGMENT_CREW";

export const NOT_CURRENT_SEGMENT_CREW_MESSAGE =
  "Your segment is not in progress. Only the crew who has the horses right now can do this.";

/** The message for a crew-turn refusal, read from an Axios error or an error that carries the BE errorCode; null for any other error. */
export function crewTurnErrorMessage(error: unknown): string | null {
  const value = error as { errorCode?: string; message?: string; response?: { data?: { errorCode?: string } } } | null;
  const code = value?.errorCode ?? value?.response?.data?.errorCode ?? value?.message;
  return code === NOT_CURRENT_SEGMENT_CREW ? NOT_CURRENT_SEGMENT_CREW_MESSAGE : null;
}
