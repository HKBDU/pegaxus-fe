import type { LandingSceneState } from "./horse-story";

// Scroll owns entry/exit only. The existing Three mixer owns choreography time.
export function createJourneyScroll(
  section: HTMLElement,
  state: LandingSceneState,
  onChange: () => void,
) {
  let touchY = 0;
  let touchMayExit = false;
  let firstTouchMove = false;
  let touchOwned = false;
  let lastWheelAt = -Infinity;
  let bypassed = false;
  let reverseInput = false;
  let scrollStyles:
    | { style: CSSStyleDeclaration; value: string; priority: string }[]
    | undefined;
  const complete = () => state.journeyCompleted && state.journeyTextReady;
  const aligned = () => Math.abs(section.getBoundingClientRect().top) <= 1;
  const release = () => {
    state.journeyPinned = false;
    scrollStyles?.forEach(({ style, value, priority }) => {
      if (value) style.setProperty("overflow-y", value, priority);
      else style.removeProperty("overflow-y");
    });
    scrollStyles = undefined;
  };
  const blockNativeScroll = () => {
    if (!scrollStyles) {
      scrollStyles = [document.documentElement.style, document.body.style].map(
        (style) => ({
          style,
          value: style.getPropertyValue("overflow-y"),
          priority: style.getPropertyPriority("overflow-y"),
        }),
      );
      // Do not add native momentum to the forward delta already consumed below.
      scrollStyles.forEach(({ style }) =>
        style.setProperty("overflow-y", "hidden", "important"),
      );
    }
  };
  const hold = () => {
    blockNativeScroll();
    state.journeyPinned = true;
  };
  const cancelEntry = () => {
    touchOwned = false;
    release();
  };
  const interactive = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        "input,textarea,select,[contenteditable=true],[role=dialog],[role=menu],[role=listbox],[data-slot=popover-content]",
      ),
    );
  const consume = (event: Event, amount: number, freshGesture: boolean) => {
    if (amount < 0) {
      reverseInput = true;
      cancelEntry();
      bypassed = false;
      return;
    }
    if (state.sceneStatus !== "ready") {
      cancelEntry();
      return;
    }
    if (
      event.defaultPrevented ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      document.hidden ||
      state.reducedMotion ||
      interactive(event.target)
    )
      return;
    if (complete() && (!state.journeyPinned || freshGesture)) {
      release();
      return;
    }
    const rect = section.getBoundingClientRect();
    if (rect.bottom <= 0 || (rect.top < -1 && !state.journeyPinned)) return;
    reverseInput = false;
    bypassed = false;
    blockNativeScroll();
    if (event.cancelable) event.preventDefault();
    // Map's later listener must not claim the same forward input.
    event.stopImmediatePropagation();
    if (rect.top > 1) {
      // Own the first forward input from Hero; never start a native fling past entry.
      // This is bounded user movement, not a scroll callback correcting overshoot.
      window.scrollBy({ top: Math.min(amount, rect.top), behavior: "instant" });
    }
    if (aligned()) hold();
    onChange();
  };
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
      return;
    const amount =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    const now = performance.now();
    const fresh = now - lastWheelAt > 200;
    if (amount > 0) lastWheelAt = now;
    consume(event, amount, fresh);
  };
  const keyboard = (event: KeyboardEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      interactive(event.target)
    )
      return;
    if (
      event.key === " " &&
      event.target instanceof Element &&
      event.target.closest("a,button")
    )
      return;
    const amount =
      event.key === "ArrowUp"
        ? -40
        : event.key === "PageUp" ||
            event.key === "Home" ||
            (event.key === " " && event.shiftKey)
          ? -innerHeight
          : event.key === "ArrowDown"
            ? 40
            : event.key === "PageDown" || event.key === " "
              ? innerHeight * 0.9
              : event.key === "End"
                ? document.documentElement.scrollHeight
                : 0;
    consume(event, amount, !event.repeat);
  };
  const touchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? 0;
    touchMayExit = complete();
    firstTouchMove = true;
    touchOwned = false;
  };
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1 || event.defaultPrevented) return;
    const next = event.touches[0].clientY;
    const amount = touchY - next;
    touchY = next;
    const fresh = firstTouchMove;
    firstTouchMove = false;
    if (
      touchOwned &&
      amount < 0 &&
      event.cancelable &&
      !interactive(event.target)
    ) {
      // A canceled touch gesture cannot reliably resume native scrolling mid-gesture.
      // Forward its upward movement without a boundary or snap-back.
      event.preventDefault();
      event.stopImmediatePropagation();
      reverseInput = true;
      release();
      bypassed = false;
      window.scrollBy({ top: amount, behavior: "instant" });
      onChange();
      return;
    }
    consume(event, amount, touchMayExit || (fresh && !complete()));
    if (event.defaultPrevented) touchOwned = true;
  };
  const scroll = () => {
    if (state.sceneStatus !== "ready") {
      cancelEntry();
      onChange();
      return;
    }
    if (aligned() && !bypassed && !reverseInput && !state.reducedMotion) {
      if (!complete()) hold();
    } else {
      const rect = section.getBoundingClientRect();
      // Release on leaving upward/navigation, not a small forward geometry drift.
      if (
        (rect.top > 1 && state.journeyPinned) ||
        rect.bottom <= 0 ||
        bypassed ||
        state.reducedMotion
      )
        release();
    }
    onChange();
  };
  const navigate = () => {
    bypassed = true;
    cancelEntry();
  };
  const anchor = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (event.target instanceof Element && event.target.closest("a[href]"))
      navigate();
  };
  const resize = () => {
    cancelEntry();
    onChange();
  };
  const visibility = () => {
    if (document.hidden) cancelEntry();
  };
  window.addEventListener("wheel", wheel, { capture: true, passive: false });
  window.addEventListener("keydown", keyboard, true);
  window.addEventListener("touchstart", touchStart, { passive: true });
  window.addEventListener("touchmove", touchMove, {
    capture: true,
    passive: false,
  });
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("popstate", navigate);
  window.addEventListener("hashchange", navigate);
  document.addEventListener("click", anchor, true);
  document.addEventListener("visibilitychange", visibility);
  scroll();
  return {
    update() {
      if (state.sceneStatus !== "ready") cancelEntry();
    },
    destroy() {
      cancelEntry();
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("keydown", keyboard, true);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("popstate", navigate);
      window.removeEventListener("hashchange", navigate);
      document.removeEventListener("click", anchor, true);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
