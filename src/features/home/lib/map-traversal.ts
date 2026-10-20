import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LandingSceneState } from "./horse-story";

/** The SVG is the sole route geometry; CSS-pixel samples are projected by HorseScene. */
export function createMapTraversal(
  section: HTMLElement,
  state: LandingSceneState,
) {
  const path = section.querySelector<SVGPathElement>("[data-horse-route]")!;
  const reveal = section.querySelector<SVGPathElement>("[data-route-reveal]")!;
  const stops = [...section.querySelectorAll<SVGGElement>("[data-map-stop]")];
  const samples = Array.from({ length: 257 }, () => ({ x: 0, y: 0 }));
  let length = 0;
  let definition = "";
  let disposed = false;
  const simplified = state.reducedMotion || innerHeight < 560;
  const measure = () => {
    definition = path.getAttribute("d") ?? "";
    length = path.getTotalLength();
    samples.forEach((sample, index) => {
      const point = path.getPointAtLength(
        (length * index) / (samples.length - 1),
      );
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
    const matrix = path.getScreenCTM();
    if (!matrix) return;
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
  const trigger = simplified
    ? null
    : ScrollTrigger.create({
        id: "landing-map-traversal",
        trigger: section,
        start: "top top",
        end: () =>
          "+=" +
          Math.round(
            Math.min(
              2200,
              Math.max(1000, innerHeight * (innerWidth >= 1024 ? 1.9 : 1.5)),
            ),
          ),
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // The last 12% is an arrival hold. No scrub lag can outlive pin release.
          const next = Math.min(1, self.progress / 0.88);
          const advancing = self.direction > 0 && next > state.mapProgress;
          if (advancing) {
            Object.assign(state, {
              mapProgress: next,
              mapUpdatedAt: performance.now(),
              mapRunRate: Math.min(
                2.5,
                Math.max(0.5, Math.abs(self.getVelocity()) / 650),
              ),
            });
          }
          Object.assign(state, { mapRunning: advancing && next < 1 });
          project();
          state.invalidate?.();
        },
        onRefresh: () => {
          measure();
          project();
        },
      });
  if (simplified) Object.assign(state, { mapProgress: 1, mapRunning: false });
  return {
    restore(progress: number) {
      if (!trigger) {
        Object.assign(state, { mapProgress: 1, mapRunning: false });
        window.scrollTo({
          top: section.getBoundingClientRect().top + scrollY,
          behavior: "instant",
        });
        project();
        return;
      }
      trigger.refresh();
      Object.assign(state, { mapProgress: progress, mapRunning: false });
      window.scrollTo({
        top:
          trigger.start +
          (trigger.end - trigger.start) * Math.min(0.9, progress * 0.88),
        behavior: "instant",
      });
      project();
    },
    update() {
      // Reset only after the whole shot is below the viewport, never visibly on reverse.
      if (
        !simplified &&
        section.getBoundingClientRect().top >= innerHeight &&
        !trigger?.isActive
      )
        Object.assign(state, { mapProgress: 0, mapRunning: false });
      project();
    },
    destroy() {
      disposed = true;
      dash?.kill();
      trigger?.kill(true);
      section.removeAttribute("data-arrived");
      stops.forEach((stop) => {
        stop.removeAttribute("data-reached");
        stop.removeAttribute("data-progress");
      });
    },
  };
}
