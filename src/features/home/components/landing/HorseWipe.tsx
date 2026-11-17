import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HorseSilhouette = lazy(() => import("./HorseSilhouette"));

const QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const subscribe = (notify: () => void) => {
  const media = matchMedia(QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

/**
 * Chapter transition into Reliability: a galloping horse silhouette crosses
 * the screen and the next chapter is revealed in its wake (clip-path wipe).
 * Desktop only; without it Reliability simply scrolls in.
 */
export function HorseWipe() {
  const enabled = useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
  const runner = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const element = runner.current;
    const section = document.querySelector<HTMLElement>("#reliability");
    if (!enabled || !element || !section) return;
    const paint = (progress: number) => {
      // The reveal edge (vw) runs slightly past both sides of the screen.
      const edge = -20 + progress * 140;
      if (progress >= 1) section.style.removeProperty("clip-path");
      else
        section.style.clipPath = `inset(0 ${Math.min(100, Math.max(0, 100 - edge))}% 0 0)`;
      element.style.transform = `translateX(calc(${edge}vw - 12vw))`;
    };
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 92%",
      end: "top 12%",
      onUpdate: (self) => paint(self.progress),
      onToggle: (self) => {
        setActive(self.isActive);
        if (self.isActive) setMounted(true);
      },
    });
    paint(trigger.progress);
    return () => {
      trigger.kill();
      section.style.removeProperty("clip-path");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div
      className="landing-wipe"
      ref={runner}
      data-active={active}
      aria-hidden="true"
    >
      {mounted && (
        <Suspense fallback={null}>
          <HorseSilhouette running={active} />
        </Suspense>
      )}
    </div>
  );
}
