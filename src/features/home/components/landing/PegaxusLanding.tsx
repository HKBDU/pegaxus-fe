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
import { preload } from "react-dom";
import horseUrl from "../../assets/horse-meshopt.glb?url&no-inline";

import { MarqueeBand } from "./MarqueeBand";
import { scrollToLandingSection } from "../../lib/landing-navigation";

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
    return this.state.failed ? null : this.props.children;
  }
}

export function PegaxusLanding() {
  // Home-only: fetch the same GLB while the separate renderer chunk is loading.
  preload(horseUrl, { as: "fetch", crossOrigin: "anonymous" });
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
  const {
    scene,
    active,
    scrolled,
    horsePresent,
    revealHero,
    updateSceneStatus,
  } = useLandingStory(root, canvasLayer);
  const [sceneStatus, setSceneStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const ready = useCallback(() => {
    if (updateSceneStatus("ready")) setSceneStatus("ready");
  }, [updateSceneStatus]);
  const unavailable = useCallback(() => {
    updateSceneStatus("unavailable");
    setSceneStatus("unavailable");
  }, [updateSceneStatus]);
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
    requestAnimationFrame(() => {
      scrollToLandingSection(section);
    });
  };
  return (
    <div
      className="pegaxus-landing"
      data-scene-status={sceneStatus}
      ref={root}
      onClick={navigateSection}
    >
      <div className="landing-scroll-progress" aria-hidden="true">
        <span />
      </div>
      <a className="landing-skip" href="#home">
        Skip to content
      </a>
      <LandingNavbar active={active} scrolled={scrolled} />
      <HorseSceneBoundary onUnavailable={unavailable}>
        <Suspense fallback={null}>
          <HorseExperience
            story={scene}
            canvasLayer={canvasLayer}
            horsePresent={horsePresent}
            onReady={ready}
            onUnavailable={unavailable}
          />
        </Suspense>
      </HorseSceneBoundary>
      <div className="landing-story">
        <HeroSection>
          <HorseLoader status={sceneStatus} onReveal={revealHero} />
        </HeroSection>
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
