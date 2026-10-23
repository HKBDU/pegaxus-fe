import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLandingStory } from "../../hooks/useLandingStory";
import { LandingNavbar } from "./LandingNavbar";
import { HeroSection } from "./HeroSection";
import { JourneySection } from "./JourneySection";
import { ComplianceSection } from "./ComplianceSection";
import { PlatformSection } from "./PlatformSection";
import { HorseCareSection } from "./HorseCareSection";
import { GlobalMovementSection } from "./GlobalMovementSection";
import { ReliabilitySection } from "./ReliabilitySection";
import { FinalCtaSection } from "./FinalCtaSection";
import { LandingFooter } from "./LandingFooter";
import { HorseLoader } from "./HorseLoader";
import "../../landing.css";

import { MarqueeBand } from "./MarqueeBand";

const HorseExperience = lazy(() => import("./HorseExperience"));

class HorseSceneBoundary extends Component<
  { children: ReactNode; onUnavailable: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? (
      <div
        className="landing-experience landing-scene-fallback"
        aria-hidden="true"
      >
        <span className="landing-eyebrow">THE JOURNEY CONTINUES</span>
        <p>Movement, with purpose.</p>
        <small>3D preview unavailable. Explore the story below.</small>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function PegaxusLanding() {
  const root = useRef<HTMLDivElement>(null);
  const canvasLayer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const html = document.documentElement;
    const attribute = html.getAttribute("data-pegaxus-scrollbar");
    const gap = html.style.getPropertyValue("--landing-scrollbar-gap");
    const priority = html.style.getPropertyPriority("--landing-scrollbar-gap");
    // Reserve the old gutter so hiding browser chrome does not reflow About or Hero.
    html.style.setProperty(
      "--landing-scrollbar-gap",
      `${innerWidth - html.clientWidth}px`,
    );
    html.setAttribute("data-pegaxus-scrollbar", "hidden");
    return () => {
      if (attribute === null) html.removeAttribute("data-pegaxus-scrollbar");
      else html.setAttribute("data-pegaxus-scrollbar", attribute);
      if (gap) html.style.setProperty("--landing-scrollbar-gap", gap, priority);
      else html.style.removeProperty("--landing-scrollbar-gap");
    };
  }, []);
  const { scene, active, scrolled, horsePresent, revealHero } = useLandingStory(
    root,
    canvasLayer,
  );
  const [pending, setPending] = useState(true);
  const ready = useCallback(() => setPending(false), []);
  const navigateSection = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    const id = link?.getAttribute("href")?.slice(1);
    const section = id
      ? root.current?.querySelector<HTMLElement>(`section[id="${id}"]`)
      : null;
    if (!section) return;
    event.preventDefault();
    // Also handles Sheet portal links after the menu closes and restores focus.
    requestAnimationFrame(() => {
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
      section.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      history.replaceState(history.state, "", `#${id}`);
    });
  };
  return (
    <div className="pegaxus-landing" ref={root} onClick={navigateSection}>
      <div className="landing-scroll-progress" aria-hidden="true">
        <span />
      </div>
      <a className="landing-skip" href="#home">
        Skip to content
      </a>
      <LandingNavbar active={active} scrolled={scrolled} />
      <HorseLoader pending={pending} onReveal={revealHero} />
      <HorseSceneBoundary onUnavailable={ready}>
        <Suspense fallback={null}>
          <HorseExperience
            story={scene}
            canvasLayer={canvasLayer}
            horsePresent={horsePresent}
            onReady={ready}
          />
        </Suspense>
      </HorseSceneBoundary>
      <div className="landing-story">
        <HeroSection />
        <MarqueeBand />
        <JourneySection />
        <ComplianceSection />
        <PlatformSection />
        <HorseCareSection />
        <GlobalMovementSection />
        <ReliabilitySection />
        <FinalCtaSection />
        <LandingFooter />
      </div>
    </div>
  );
}
