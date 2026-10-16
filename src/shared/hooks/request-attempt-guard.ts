export type RequestAttemptState = { isRunning: boolean; isBlocked: boolean };

export const RETRY_COOLDOWN_MS = 3000;

export function createRequestAttemptGuard(onChange?: (state: RequestAttemptState) => void) {
  let isRunning = false;
  let isBlocked = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

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
        clearTimeout(timer);
        timer = setTimeout(() => {
          isBlocked = false;
          publish();
        }, RETRY_COOLDOWN_MS);
        publish();
        throw error;
      } finally {
        isRunning = false;
        publish();
      }
    },
    reset() {
      if (!isBlocked) return;
      clearTimeout(timer);
      isBlocked = false;
      publish();
    },
  };
}
