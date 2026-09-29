export type RequestAttemptState = { isRunning: boolean; isBlocked: boolean };

export function createRequestAttemptGuard(onChange?: (state: RequestAttemptState) => void) {
  let isRunning = false;
  let isBlocked = false;

  function publish() {
    onChange?.({ isRunning, isBlocked });
  }

  return {
    async run<T>(request: () => Promise<T>): Promise<{ started: false } | { started: true; value: T }> {
      if (isRunning || isBlocked) return { started: false };
      isRunning = true;
      publish();
      try {
        return { started: true, value: await request() };
      } catch (error) {
        isBlocked = true;
        publish();
        throw error;
      } finally {
        isRunning = false;
        publish();
      }
    },
    reset() {
      if (!isBlocked) return;
      isBlocked = false;
      publish();
    },
  };
}
