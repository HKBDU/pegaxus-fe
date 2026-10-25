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
  const simplified = state.reducedMotion;
  let waiting = false;
  let bypassed = false;
  let lastY = scrollY;
  let touchY = 0;
  let reverseInput = false;
  let correctedY: number | undefined;
  let pin:
    | {
        top: number;
        placeholder: HTMLDivElement;
        styles: {
          style: CSSStyleDeclaration;
          property: string;
          value: string;
          priority: string;
        }[];
      }
    | undefined;
  let navigationUntil =
    location.hash && location.hash !== "#movement"
      ? performance.now() + 1500
      : 0;
  const boundary = () =>
    pin?.top ?? section.getBoundingClientRect().top + scrollY;
  const release = () => {
    waiting = false;
    if (pin) {
      pin.styles.forEach(({ style, property, value, priority }) => {
        if (value) style.setProperty(property, value, priority);
        else style.removeProperty(property);
      });
      pin.placeholder.remove();
      pin = undefined;
    }
    section.removeAttribute("data-map-pinned");
    Object.assign(state, { mapRunning: false });
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
    const progress = state.mapProgress;
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
    if (!waiting) {
      const rect = section.getBoundingClientRect();
      const placeholder = document.createElement("div");
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.style.height = `${rect.height}px`;
      const changes: [CSSStyleDeclaration, string, string][] = [
        [document.documentElement.style, "overflow-y", "hidden"],
        [document.body.style, "overflow-y", "hidden"],
        [section.style, "position", "fixed"],
        [section.style, "top", "0px"],
        [section.style, "left", `${rect.left}px`],
        [section.style, "width", `${rect.width}px`],
        [section.style, "height", `${Math.max(rect.height, innerHeight)}px`],
        [section.style, "box-sizing", "border-box"],
        [section.style, "z-index", "5"],
      ];
      pin = {
        top: rect.top + scrollY,
        placeholder,
        styles: changes.map(([style, property]) => ({
          style,
          property,
          value: style.getPropertyValue(property),
          priority: style.getPropertyPriority(property),
        })),
      };
      // Preserve document flow while the Map itself covers the viewport.
      section.before(placeholder);
      changes.forEach(([style, property, value]) =>
        style.setProperty(property, value, "important"),
      );
      section.setAttribute("data-map-pinned", "");
      waiting = true;
    }
    const end = boundary();
    // A correction after native momentum is not a user reversing direction.
    if (Math.abs(scrollY - end) > 1) {
      correctedY = Math.round(end);
      lastY = correctedY;
      window.scrollTo({ top: end, behavior: "instant" });
    }
  };
  const advance = (amount: number) => {
    if (amount <= 0 || bypassed || document.hidden || state.mapProgress >= 1)
      return;
    const now = performance.now();
    // Require sustained forward scrolling and limit jumps from large input events.
    const step = Math.min(0.02, amount / (innerHeight * 3.4));
    const elapsed = Math.min(80, Math.max(16, now - state.mapUpdatedAt)) / 1000;
    Object.assign(state, {
      mapProgress: Math.min(1, state.mapProgress + step),
      mapUpdatedAt: now,
      mapRunRate: Math.min(2, (step * 5.5) / elapsed),
      mapRunning: !simplified && state.inMap,
    });
    if (state.mapProgress >= 1) release();
    project();
    state.invalidate?.();
  };
  const constrain = (amount: number) => {
    if (amount !== 0) navigationUntil = 0;
    if (amount < 0) {
      reverseInput = true;
      correctedY = undefined;
      release();
      return false;
    }
    if (amount > 0) reverseInput = false;
    if (
      amount === 0 ||
      bypassed ||
      state.mapProgress >= 1 ||
      document.hidden ||
      performance.now() < navigationUntil
    )
      return false;
    if (waiting) {
      advance(amount);
      return true;
    }
    const end = boundary();
    // A resize can move the entry just above the current native scroll position.
    const atVisibleEntry =
      state.inMap && section.getBoundingClientRect().bottom > 0;
    if (
      (scrollY <= end + 2 || lastY <= end + 2 || atVisibleEntry) &&
      scrollY + amount > end
    ) {
      const remaining = Math.max(0, end - scrollY);
      beginHold();
      advance(amount - remaining);
      return true;
    }
    return false;
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
  const pointerStart = () => {
    reverseInput = false;
    correctedY = undefined;
    navigationUntil = 0;
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
    if (correctedY !== undefined && Math.abs(y - correctedY) <= 1) {
      correctedY = undefined;
      lastY = y;
      return;
    }
    const amount = y - lastY;
    if (amount !== 0) {
      if (amount < 0) release();
      const end = boundary();
      const forward =
        amount > 0 &&
        !reverseInput &&
        !bypassed &&
        !document.hidden &&
        performance.now() >= navigationUntil;
      if (
        forward &&
        (lastY <= end + 2 || waiting) &&
        y >= end &&
        state.mapProgress < 1
      ) {
        const travelled = y - Math.max(lastY, end);
        beginHold();
        advance(travelled);
      }
    }
    lastY = scrollY;
  };
  const visibility = () => {
    if (document.hidden) release();
  };
  const resizePin = () => {
    if (!pin) return;
    const rect = pin.placeholder.getBoundingClientRect();
    pin.top = rect.top + scrollY;
    section.style.setProperty("left", `${rect.left}px`, "important");
    section.style.setProperty("width", `${rect.width}px`, "important");
    section.style.setProperty(
      "height",
      `${Math.max(rect.height, innerHeight)}px`,
      "important",
    );
    beginHold();
    project();
    state.invalidate?.();
  };
  const tick = () => {
    const now = performance.now();
    const rect = section.getBoundingClientRect();
    const moving =
      state.mapRunning &&
      !simplified &&
      !bypassed &&
      !document.hidden &&
      state.inMap &&
      state.mapProgress < 1 &&
      now - state.mapUpdatedAt < 80;
    const stopped = state.mapRunning && !moving;
    Object.assign(state, { mapRunning: moving });
    if (waiting && (rect.top > innerHeight || rect.bottom < 0)) release();
    project();
    if (stopped) state.invalidate?.();
  };
  window.addEventListener("wheel", wheel, { passive: false, capture: true });
  window.addEventListener("keydown", keyboard, true);
  window.addEventListener("touchstart", touchStart, { passive: true });
  window.addEventListener("pointerdown", pointerStart, true);
  window.addEventListener("touchmove", touchMove, {
    passive: false,
    capture: true,
  });
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", resizePin, { passive: true });
  window.addEventListener("hashchange", navigate);
  window.addEventListener("popstate", navigate);
  document.addEventListener("click", anchor, true);
  document.addEventListener("visibilitychange", visibility);
  gsap.ticker.add(tick);
  return {
    update() {
      project();
    },
    destroy() {
      disposed = true;
      release();
      gsap.ticker.remove(tick);
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("keydown", keyboard, true);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("pointerdown", pointerStart, true);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resizePin);
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
      document.removeEventListener("click", anchor, true);
      document.removeEventListener("visibilitychange", visibility);
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
