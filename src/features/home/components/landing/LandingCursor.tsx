import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";

const QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const MAGNETIC =
  ".landing-button, .brand-action, .landing-text-link, .landing-scroll-cue";
const INTERACTIVE = "a, button, [role='button']";

const subscribe = (notify: () => void) => {
  const media = matchMedia(QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

/**
 * Desktop-only follower ring with magnetic calls to action.
 * The native cursor stays visible; the ring is decoration and never blocks input.
 */
export function LandingCursor() {
  const enabled = useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ring.current;
    if (!enabled || !element) return;
    const x = gsap.quickTo(element, "x", { duration: 0.45, ease: "power3" });
    const y = gsap.quickTo(element, "y", { duration: 0.45, ease: "power3" });
    let magnet: HTMLElement | null = null;

    const release = () => {
      if (!magnet) return;
      gsap.to(magnet, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.4)",
      });
      magnet = null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      element.dataset.visible = "true";
      const target = event.target instanceof Element ? event.target : null;
      const spotlight = target?.closest("[data-spotlight]");
      const interactive = target?.closest(INTERACTIVE);
      element.dataset.mode = spotlight ? "lens" : interactive ? "link" : "idle";
      const nextMagnet = target?.closest<HTMLElement>(MAGNETIC) ?? null;
      if (nextMagnet !== magnet) release();
      if (nextMagnet) {
        magnet = nextMagnet;
        const box = nextMagnet.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        gsap.to(nextMagnet, {
          x: dx * 0.25,
          y: dy * 0.35,
          duration: 0.4,
          ease: "power3",
        });
        // The ring snaps towards the centre of a magnetic target.
        x(box.left + box.width / 2 + dx * 0.4);
        y(box.top + box.height / 2 + dy * 0.4);
        return;
      }
      x(event.clientX);
      y(event.clientY);
    };
    const hide = () => {
      element.dataset.visible = "false";
      release();
    };
    // Content moves under a still pointer while scrolling; drop hover modes.
    const scroll = () => {
      element.dataset.mode = "idle";
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      release();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      className="landing-cursor"
      ref={ring}
      data-visible="false"
      data-mode="idle"
      aria-hidden="true"
    />
  );
}
