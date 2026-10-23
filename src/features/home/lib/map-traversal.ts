import gsap from "gsap";
import type { LandingSceneState } from "./horse-story";

/** The SVG is the sole route geometry; CSS-pixel samples are projected by HorseScene. */
export function createMapTraversal(
  section: HTMLElement,
  state: LandingSceneState,
) {
  const path = section.querySelector<SVGPathElement>("[data-horse-route]");
  const reveal = section.querySelector<SVGPathElement>("[data-route-reveal]");
  if (!path || !reveal) {
    section.dataset.traversal = "unavailable";
    return {
      update() {},
      destroy() {
        section.removeAttribute("data-traversal");
      },
    };
  }
  const stops = [...section.querySelectorAll<SVGGElement>("[data-map-stop]")];
  const samples = Array.from({ length: 257 }, () => ({ x: 0, y: 0 }));
  let length = 0;
  let definition = "";
  let disposed = false;
  let measurable = true;
  const simplified = state.reducedMotion || innerHeight < 560;
  const skip = section.querySelector<HTMLButtonElement>("[data-map-skip]");
  let waiting = false;
  let bypassed = false;
  let target = state.mapProgress;
  let direction = 0;
  let lastY = scrollY;
  let inputAt = 0;
  let holdAt = 0;
  let previousTime = performance.now();
  let touchY = 0;
  let navigationUntil =
    location.hash && location.hash !== "#movement"
      ? performance.now() + 1500
      : 0;
  const boundary = () =>
    section.getBoundingClientRect().bottom + scrollY - innerHeight;
  const release = () => {
    waiting = false;
    if (skip) skip.hidden = true;
  };
  const failOpen = () => {
    bypassed = true;
    release();
    Object.assign(state, { mapRunning: false });
  };
  const measure = () => {
    try {
      definition = path.getAttribute("d") ?? "";
      length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0)
        throw new Error("Unusable map path");
      samples.forEach((sample, index) => {
        const point = path.getPointAtLength(
          (length * index) / (samples.length - 1),
        );
        if (!Number.isFinite(point.x + point.y))
          throw new Error("Invalid map point");
        sample.x = point.x;
        sample.y = point.y;
      });
      stops.forEach((stop) => {
        const x = Number(stop.dataset.x),
          y = Number(stop.dataset.y);
        let nearest = 0,
          distance = Infinity;
        samples.forEach((sample, index) => {
          const next = (sample.x - x) ** 2 + (sample.y - y) ** 2;
          if (next < distance) {
            distance = next;
            nearest = index;
          }
        });
        stop.dataset.progress = String(nearest / (samples.length - 1));
      });
      measurable = true;
    } catch {
      measurable = false;
      failOpen();
    }
  };
  measure();
  const dash = simplified
    ? null
    : gsap.to(section.querySelectorAll("[data-route-flow]"), {
        strokeDashoffset: -36,
        duration: 1.5,
        repeat: -1,
        ease: "none",
        paused: true,
      });
  const project = () => {
    if (disposed) return;
    // React can swap the responsive curve after GSAP's media-query callback.
    if (path.getAttribute("d") !== definition) measure();
    if (!measurable) return;
    const matrix = path.getScreenCTM();
    if (
      !matrix ||
      !Number.isFinite(
        matrix.a + matrix.b + matrix.c + matrix.d + matrix.e + matrix.f,
      )
    ) {
      if (waiting) failOpen();
      return;
    }
    const progress = simplified ? 1 : state.mapProgress;
    const index = progress * (samples.length - 1);
    const first = Math.min(samples.length - 2, Math.floor(index));
    const fraction = index - first;
    const a = samples[first],
      b = samples[first + 1];
    const x = a.x + (b.x - a.x) * fraction,
      y = a.y + (b.y - a.y) * fraction;
    Object.assign(state, {
      mapScreenX: matrix.a * x + matrix.c * y + matrix.e,
      mapScreenY: matrix.b * x + matrix.d * y + matrix.f,
      mapTangentX: matrix.a * (b.x - a.x) + matrix.c * (b.y - a.y),
      mapTangentY: matrix.b * (b.x - a.x) + matrix.d * (b.y - a.y),
      mapHorseHeight: state.profile === "desktop" ? 76 : 58,
    });
    reveal.setAttribute("stroke-dashoffset", String(1 - progress));
    stops.forEach((stop) =>
      stop.toggleAttribute(
        "data-reached",
        progress >= Number(stop.dataset.progress) - 0.002,
      ),
    );
    section.toggleAttribute("data-arrived", progress >= 1);
    section.dataset.traversal =
      progress >= 1
        ? "arrived"
        : bypassed
          ? "bypassed"
          : waiting
            ? "waiting"
            : "traversing";
    const rect = section.getBoundingClientRect();
    if (
      !simplified &&
      !document.hidden &&
      rect.top < innerHeight &&
      rect.bottom > 0
    )
      dash?.play();
    else dash?.pause();
  };
  const beginHold = () => {
    if (waiting) return;
    waiting = true;
    holdAt = performance.now();
    if (skip) skip.hidden = false;
    // One boundary correction per downward attempt, never a scrollTo ticker.
    const end = boundary();
    // A correction after native momentum is not a user reversing direction.
    lastY = Math.round(end);
    window.scrollTo({ top: end, behavior: "instant" });
  };
  const constrain = (amount: number) => {
    if (amount < 0) {
      direction = -1;
      release();
      return false;
    }
    if (
      amount === 0 ||
      simplified ||
      bypassed ||
      state.mapProgress >= 1 ||
      document.hidden ||
      performance.now() < navigationUntil
    )
      return false;
    const end = boundary();
    // A resize can move the exit just above the current native scroll position.
    const atVisibleExit =
      state.inMap && section.getBoundingClientRect().bottom > 0;
    if (
      (scrollY <= end + 2 || lastY <= end + 2 || atVisibleExit) &&
      scrollY + amount > end
    ) {
      direction = 1;
      inputAt = performance.now();
      beginHold();
      return true;
    }
    return waiting;
  };
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.defaultPrevented) return;
    const amount =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (constrain(amount)) event.preventDefault();
  };
  const keyboard = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target instanceof Element &&
        event.target.closest("input,textarea,select,[contenteditable=true]"))
    )
      return;
    if (
      event.key === " " &&
      event.target instanceof Element &&
      event.target.closest("button,a")
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
    if (constrain(amount)) event.preventDefault();
  };
  const touchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? 0;
  };
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const next = event.touches[0].clientY;
    const amount = touchY - next;
    touchY = next;
    if (constrain(amount)) event.preventDefault();
  };
  const navigate = () => {
    navigationUntil = performance.now() + 1500;
    release();
  };
  const anchor = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a[href^="#"]'))
      navigate();
  };
  const scroll = () => {
    const y = scrollY;
    const amount = y - lastY;
    if (amount !== 0) {
      direction = Math.sign(amount);
      inputAt = performance.now();
      if (amount < 0) release();
      const end = boundary();
      if (
        amount > 0 &&
        lastY <= end + 2 &&
        y > end + 2 &&
        !simplified &&
        !bypassed &&
        state.mapProgress < 1 &&
        !document.hidden &&
        performance.now() >= navigationUntil
      )
        beginHold();
    }
    lastY = scrollY;
    target = Math.max(
      0,
      Math.min(
        0.92,
        0.92 * (1 - (boundary() - scrollY) / (innerHeight * 0.85)),
      ),
    );
  };
  const visibility = () => {
    if (document.hidden) failOpen();
  };
  const skipWait = () => {
    Object.assign(state, { mapProgress: 1, mapRunning: false });
    release();
    project();
    state.invalidate?.();
  };
  const tick = () => {
    const now = performance.now();
    const delta = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;
    const rect = section.getBoundingClientRect();
    if (
      waiting &&
      (document.hidden ||
        now - holdAt > 10000 ||
        (now - holdAt > 1500 && now - state.mapFrameAt > 1500))
    )
      failOpen();
    const moving =
      !simplified &&
      !bypassed &&
      !document.hidden &&
      state.inMap &&
      now - state.mapFrameAt < 500 &&
      state.mapProgress < 1 &&
      (waiting ||
        (direction > 0 && now - inputAt < 160 && target > state.mapProgress));
    if (moving) {
      Object.assign(state, {
        mapProgress: Math.min(
          waiting ? 1 : target,
          state.mapProgress + delta / 5.5,
        ),
        mapUpdatedAt: now,
        mapRunRate: 1,
      });
    }
    Object.assign(state, { mapRunning: moving && state.mapProgress < 1 });
    if (state.mapProgress >= 1) release();
    if (waiting && (rect.top > innerHeight || rect.bottom < 0)) release();
    project();
    if (moving) state.invalidate?.();
  };
  if (!simplified) {
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", keyboard);
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    document.addEventListener("click", anchor, true);
    document.addEventListener("visibilitychange", visibility);
    skip?.addEventListener("click", skipWait);
    gsap.ticker.add(tick);
  }
  if (simplified) Object.assign(state, { mapProgress: 1, mapRunning: false });
  return {
    update() {
      project();
    },
    destroy() {
      disposed = true;
      release();
      gsap.ticker.remove(tick);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
      document.removeEventListener("click", anchor, true);
      document.removeEventListener("visibilitychange", visibility);
      skip?.removeEventListener("click", skipWait);
      dash?.kill();
      Object.assign(state, { mapRunning: false });
      section.removeAttribute("data-traversal");
      section.removeAttribute("data-arrived");
      stops.forEach((stop) => {
        stop.removeAttribute("data-reached");
        stop.removeAttribute("data-progress");
      });
    },
  };
}
