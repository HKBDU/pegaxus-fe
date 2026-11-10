import { useCallback, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HORSE_CHAPTERS, type LandingChapter } from "../lib/landing-navigation";
import { createMapTraversal } from "../lib/map-traversal";
import { createJourneyScroll } from "../lib/journey-scroll";
import {
  createLandingStory,
  getHorseShots,
  type StoryProfile,
} from "../lib/horse-story";

export type { LandingSceneState } from "../lib/horse-story";
gsap.registerPlugin(ScrollTrigger, useGSAP);

export function useLandingStory(
  root: RefObject<HTMLDivElement | null>,
  canvasLayer: RefObject<HTMLDivElement | null>,
) {
  const scene = useRef(createLandingStory("mobile", true));
  const initialMapAnchor = useRef(location.hash === "#movement");
  const [active, setActive] = useState<LandingChapter>("home");
  const [scrolled, setScrolled] = useState(false);
  const [horsePresent, setHorsePresent] = useState(true);
  const updateSceneStatus = useCallback((status: "ready" | "unavailable") => {
    const state = scene.current;
    if (state.sceneStatus === "unavailable" && status === "ready") return false;
    Object.assign(state, { sceneStatus: status });
    return true;
  }, []);
  const revealHero = useCallback(() => {
    const state = scene.current;
    Object.assign(state, { heroIntroReady: true });
    state.invalidate?.();
  }, []);
  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      const mm = gsap.matchMedia();
      let viewportPosition = { x: scrollX, y: scrollY };
      let mediaPosition: { x: number; y: number } | undefined;
      const trackPosition = () => {
        if (!mediaPosition) viewportPosition = { x: scrollX, y: scrollY };
      };
      const rememberPosition = () => {
        mediaPosition = viewportPosition;
      };
      const restorePosition = () => {
        const position = mediaPosition;
        mediaPosition = undefined;
        if (position && (scrollX !== position.x || scrollY !== position.y))
          window.scrollTo({
            left: position.x,
            top: position.y,
            behavior: "instant",
          });
      };
      // GSAP may clear recorded scroll positions while rebuilding media contexts.
      // These lifecycle methods exist in the installed GSAP runtime but lack typings.
      const mediaEvents = gsap as typeof gsap & {
        addEventListener(type: string, listener: () => void): void;
        removeEventListener(type: string, listener: () => void): void;
      };
      mediaEvents.addEventListener("matchMediaInit", rememberPosition);
      mediaEvents.addEventListener("matchMedia", restorePosition);
      window.addEventListener("scroll", trackPosition, { passive: true });
      mm.add(
        {
          desktop: "(min-width: 1024px)",
          tablet: "(min-width: 768px) and (max-width: 1023px)",
          mobile: "(max-width: 767px)",
          reduced: "(prefers-reduced-motion: reduce)",
          short: "(max-height: 559px)",
        },
        (context) => {
          const conditions = context.conditions!;
          const profile: StoryProfile = conditions.desktop
            ? "desktop"
            : conditions.tablet
              ? "tablet"
              : "mobile";
          const reduced = Boolean(conditions.reduced);
          const state = scene.current;
          const resumeJourney = state.inJourney;
          const resumeMap = state.inMap || initialMapAnchor.current;
          initialMapAnchor.current = false;
          const previous = {
            sceneStatus: state.sceneStatus,
            heroCompleted: state.heroCompleted,
            heroLifecycle: state.heroLifecycle,
            heroEffectTime: state.heroEffectTime,
            heroIntroReady: state.heroIntroReady,
            heroPhase: state.heroPhase,
            heroRevealTime: state.heroRevealTime,
            heroCameraReady: state.heroCameraReady,
            heroCalmReady: state.heroCalmReady,
            heroContacts: state.heroContacts,
            heroWalkLoops: state.heroWalkLoops,
            heroHoof: state.heroHoof,
            hoofPulses: state.hoofPulses,
            journeyEffectTime: state.journeyEffectTime,
            journeyContacts: state.journeyContacts,
            journeyHoofPulses: state.journeyHoofPulses,
            introX: state.introX,
            introZ: state.introZ,
            journeyCompleted: state.journeyCompleted,
            journeyLifecycle: state.journeyLifecycle,
            journeyStopProgress: state.journeyStopProgress,
            journeyTextTime: state.journeyTextTime,
            journeyTextReady: state.journeyTextReady,
            journeyPhase: state.journeyPhase,
            journeyTravel: state.journeyTravel,
            journeyDistance: state.journeyDistance,
            journeyTime: state.journeyTime,
            journeyOffsetX: state.journeyOffsetX,
            journeyOffsetZ: state.journeyOffsetZ,
            journeyYaw: state.journeyYaw,
            mapProgress: state.mapProgress,
            mapViewportTop: state.mapViewportTop,
            invalidate: state.invalidate,
            shotVersion: state.shotVersion + 1,
          };
          Object.assign(state, createLandingStory(profile, reduced), previous, {
            visible: !document.hidden,
            lowPower:
              profile !== "desktop" ||
              (navigator.hardwareConcurrency > 0 &&
                navigator.hardwareConcurrency <= 4),
          });
          const shots = getHorseShots(profile, reduced);
          if (resumeJourney || resumeMap)
            Object.assign(
              state,
              resumeJourney ? shots.journey : shots.movement,
              {
                inHero: false,
                inJourney: resumeJourney,
                inMap: resumeMap,
              },
            );
          const sections = HORSE_CHAPTERS.map((id) =>
            element.querySelector<HTMLElement>("#" + id)!,
          );
          const hero = sections[0];
          const journey = sections[1];
          const map = element.querySelector<HTMLElement>("#movement")!;
          const journeyText = reduced
            ? null
            : gsap
                .timeline({ paused: true })
                .from(
                  journey.querySelector(".landing-eyebrow"),
                  { opacity: 0, y: 8, duration: 0.45 },
                  0,
                )
                .from(
                  journey.querySelector("[data-journey-headline]"),
                  { opacity: 0, y: 12, duration: 0.8 },
                  0.15,
                )
                .from(
                  journey.querySelector("h2 em"),
                  { opacity: 0, duration: 0.9 },
                  0.35,
                )
                .from(
                  journey.querySelector(".landing-lead"),
                  { opacity: 0, y: 12, duration: 0.65 },
                  0.55,
                )
                .from(
                  journey.querySelectorAll(".landing-stage-line li"),
                  { opacity: 0, y: 10, duration: 0.5, stagger: 0.1 },
                  0.7,
                )
                .from(
                  journey.querySelector(".landing-caption"),
                  { opacity: 0, duration: 0.5 },
                  1.1,
                );
          let journeyVisibleAt = 0;
          let departurePortrait = -1;
          let presentationLayer: HTMLDivElement | null = null;
          let journeyScroll: ReturnType<typeof createJourneyScroll> | undefined;
          const syncJourneyText = () => {
            journeyScroll?.update();
            if (canvasLayer.current !== presentationLayer) {
              presentationLayer = canvasLayer.current;
              requestUpdate();
            }
            if (journey.dataset.lifecycle !== state.journeyLifecycle)
              journey.dataset.lifecycle = state.journeyLifecycle;
            if (journey.dataset.phase !== state.journeyPhase)
              journey.dataset.phase = state.journeyPhase;
            const portrait =
              state.journeyPhase === "STOPPING"
                ? state.journeyStopProgress
                : state.journeyPhase === "SETTLING" ||
                    state.journeyPhase === "POSE_READY"
                  ? 1
                  : 0;
            if (departurePortrait !== portrait) {
              departurePortrait = portrait;
              journey.style.setProperty(
                "--departure-portrait",
                portrait.toFixed(3),
              );
            }
            if (!journeyText) {
              state.journeyTextReady = reduced && state.journeyCompleted;
              return;
            }
            if (
              state.sceneStatus !== "ready" ||
              !state.inJourney ||
              !state.journeyReady ||
              !state.visible ||
              state.journeyLifecycle === "SUSPENDED"
            ) {
              journeyVisibleAt = 0;
              journeyText.pause();
              state.journeyTextTime = journeyText.time();
              return;
            }
            if (!journeyVisibleAt) journeyVisibleAt = performance.now();
            // Keep the existing text-only escape when WebGL cannot produce frames.
            if (
              performance.now() - journeyVisibleAt > 5000 &&
              performance.now() - state.horseFrameAt > 1500
            ) {
              journeyText.progress(1).pause();
              Object.assign(state, {
                journeyCompleted: true,
                journeyPhase: "POSE_READY",
                journeyLifecycle: "COMPLETED",
              });
            } else if (state.journeyTextReady) journeyText.progress(1).pause();
            else if (
              state.journeyPhase === "POSE_READY" &&
              journeyText.paused()
            )
              journeyText.play(state.journeyTextTime);
            Object.assign(state, {
              journeyTextTime: journeyText.time(),
              journeyTextReady: journeyText.progress() >= 1,
            });
            if (state.journeyTextReady)
              Object.assign(state, { journeyLifecycle: "COMPLETED" });
          };
          const progressFill = element.querySelector<HTMLElement>(
            ".landing-scroll-progress > span",
          );
          let lastPresent: boolean | undefined;
          let lastScrolled: boolean | undefined;
          let currentShot = "";
          let frame = 0;
          let refreshFrame = 0;
          let disposed = false;

          const updatePresentation = () => {
            const viewportProfile =
              innerWidth >= 1024
                ? "desktop"
                : innerWidth >= 768
                  ? "tablet"
                  : "mobile";
            if (viewportProfile !== profile) return;
            const heroRect = hero.getBoundingClientRect();
            const journeyRect = journey.getBoundingClientRect();
            const mapRect = map.getBoundingClientRect();
            const heldJourney = state.journeyPinned && state.visible;
            const visibleHeight = (rect: DOMRect) =>
              Math.max(
                0,
                Math.min(rect.bottom, innerHeight) - Math.max(0, rect.top),
              );
            const heroVisibleHeight = visibleHeight(heroRect);
            const journeyVisibleHeight = visibleHeight(journeyRect);
            // Presentation ownership follows the same visible bounds in both directions.
            // Journey may show its paused snapshot before autoplay is ready at entry.
            const inJourney =
              heldJourney ||
              (journeyVisibleHeight > 0 &&
                (journeyVisibleHeight > heroVisibleHeight ||
                  (journeyVisibleHeight === heroVisibleHeight &&
                    currentShot === "journey")));
            const inHero = !inJourney && heroVisibleHeight > 0;
            const inMap =
              !inHero &&
              !inJourney &&
              mapRect.top < innerHeight &&
              mapRect.bottom > 0;
            const nextShot = inHero
              ? "home"
              : inJourney
                ? "journey"
                : inMap
                  ? "map"
                  : "none";
            if (currentShot !== nextShot) {
              currentShot = nextShot;
              Object.assign(
                state,
                inJourney ? shots.journey : inMap ? shots.movement : shots.home,
                {
                  inHero,
                  inJourney,
                  inMap,
                  horsePresence: nextShot === "none" ? 0 : 1,
                  shotVersion: state.shotVersion + 1,
                },
              );
            }
            const layer = canvasLayer.current;
            if (layer) layer.dataset.shot = nextShot;
            if (layer && inJourney)
              layer.style.setProperty(
                "--journey-stage-height",
                Math.min(journeyRect.height, innerHeight - 76) + "px",
              );
            const stageTop =
              layer?.getBoundingClientRect().top ??
              (inJourney
                ? profile === "desktop"
                  ? 76
                  : 0
                : inMap || profile === "desktop"
                  ? 0
                  : 75);
            const stageHeight =
              layer?.clientHeight ??
              (inMap || profile === "desktop"
                ? innerHeight
                : innerHeight * 0.43);
            const rect = inHero ? heroRect : inMap ? mapRect : journeyRect;
            // Keep Hero's composition anchored to its section, not the viewport.
            const offset = inHero
              ? heroRect.top
              : inMap
                ? 0
                : rect.top - (profile === "desktop" ? 0 : stageTop);
            const clipTop = Math.max(
              0,
              Math.min(stageHeight, rect.top - stageTop),
            );
            const clipBottom = Math.max(
              0,
              Math.min(stageHeight, stageTop + stageHeight - rect.bottom),
            );
            const present =
              nextShot !== "none" && clipTop + clipBottom < stageHeight;
            Object.assign(state, {
              mapViewportTop: inMap ? mapRect.top : state.mapViewportTop,
              stageOffsetY: offset,
              clipTop,
              clipBottom,
              journeyReady:
                inJourney &&
                (reduced ||
                  heldJourney ||
                  (Math.abs(journeyRect.top) <= 1 &&
                    journeyRect.height >= innerHeight - 1)) &&
                clipTop < stageHeight * 0.12 &&
                clipBottom < stageHeight * 0.12 &&
                offset < stageHeight * 0.12,
              heroReady:
                inHero &&
                present &&
                Math.min(heroRect.bottom, innerHeight) -
                  Math.max(heroRect.top, stageTop) >=
                  Math.min(heroRect.height, stageHeight) * 0.5,
            });
            if (!state.heroReady && state.heroLifecycle === "PLAYING")
              Object.assign(state, { heroLifecycle: "SUSPENDED" });
            if (!state.inHero || !state.heroReady)
              Object.assign(state, {
                pointerX: 0,
                pointerY: 0,
                pointerActive: false,
              });
            if (!state.journeyReady && state.journeyLifecycle === "PLAYING")
              Object.assign(state, { journeyLifecycle: "SUSPENDED" });
            if (layer) {
              layer.style.setProperty("--scene-offset-y", offset + "px");
              layer.style.clipPath =
                "inset(" +
                clipTop +
                "px " +
                (inJourney && profile === "desktop" ? "48% " : "0 ") +
                clipBottom +
                "px " +
                (inHero && profile === "desktop" && !state.heroCameraReady
                  ? "50%"
                  : "0") +
                ")";
              layer.style.opacity = present ? "1" : "0";
            }
            traversal.update();
            if (lastPresent !== present) {
              lastPresent = present;
              setHorsePresent(present);
            }
            const nextScrolled = scrollY > 32;
            if (lastScrolled !== nextScrolled) {
              lastScrolled = nextScrolled;
              setScrolled(nextScrolled);
            }
            const range =
              document.documentElement.scrollHeight -
              document.documentElement.clientHeight;
            const progress =
              range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
            if (progressFill)
              progressFill.style.transform = "scaleX(" + progress + ")";
            state.invalidate?.();
          };
          const requestUpdate = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
              frame = 0;
              updatePresentation();
            });
          };
          journeyScroll = createJourneyScroll(journey, state, () => {
            requestUpdate();
            syncJourneyText();
          });
          const traversal = createMapTraversal(map, state);
          const refresh = () => {
            if (refreshFrame || disposed) return;
            refreshFrame = requestAnimationFrame(() => {
              refreshFrame = 0;
              if (!disposed) {
                ScrollTrigger.refresh();
                updatePresentation();
              }
            });
          };
          gsap.ticker.add(syncJourneyText);

          sections.forEach((section) => {
            ScrollTrigger.create({
              trigger: section,
              start: "top center",
              end: "bottom center",
              onToggle: (self) => {
                if (self.isActive)
                  setActive(
                    ["care", "movement", "reliability"].includes(section.id)
                      ? "platform"
                      : (section.id as LandingChapter),
                  );
              },
            });
            if (reduced) return;
            if (
              ["compliance", "platform", "reliability"].includes(section.id)
            ) {
              const rows = section.querySelectorAll(
                ".landing-preview-checklist > div, .landing-preview-timeline > li",
              );
              gsap.from(rows, {
                y: 14,
                opacity: 0,
                stagger: 0.12,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section.querySelector("[data-interface]"),
                  start: "top 75%",
                  once: true,
                },
              });
            }
            if (section.id === "compliance")
              gsap.from(section.querySelector(".landing-document-sheet"), {
                x: 25,
                rotation: 0,
                duration: 1.1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 75%",
                  once: true,
                },
              });
            const copy = section.querySelector("[data-reveal]");
            if (copy && section.id !== "journey")
              gsap.from(copy.children, {
                opacity: 0,
                y: 24,
                duration: 0.75,
                stagger: 0.09,
                ease: "power2.out",
                scrollTrigger: { trigger: copy, start: "top 85%", once: true },
              });
            section
              .querySelectorAll<HTMLElement>("[data-media-reveal]")
              .forEach((media) => {
                gsap.from(media, {
                  clipPath: "inset(12% 0 12% 0)",
                  duration: 1.1,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: media,
                    start: "top 88%",
                    once: true,
                  },
                });
                if (
                  profile === "desktop" &&
                  matchMedia("(hover: hover) and (pointer: fine)").matches
                ) {
                  const image = media.querySelector("img");
                  if (image)
                    gsap.fromTo(
                      image,
                      { yPercent: -3 },
                      {
                        yPercent: 3,
                        ease: "none",
                        scrollTrigger: {
                          trigger: media,
                          start: "top bottom",
                          end: "bottom top",
                          scrub: 0.6,
                        },
                      },
                    );
                }
              });
            section.querySelectorAll("[data-interface]").forEach((preview) => {
              gsap.fromTo(
                preview,
                { scale: 0.97, clipPath: "inset(8% 0 0 0)" },
                {
                  scale: 1,
                  clipPath: "inset(0% 0 0 0)",
                  ease: "none",
                  scrollTrigger: {
                    trigger: preview,
                    start: "top 90%",
                    end: "center 55%",
                    scrub: 0.5,
                  },
                },
              );
            });
          });
          const clearPointer = () =>
            Object.assign(state, {
              pointerX: 0,
              pointerY: 0,
              pointerActive: false,
            });
          const fine = matchMedia("(hover: hover) and (pointer: fine)");
          const pointer = (event: PointerEvent) => {
            if (
              reduced ||
              profile !== "desktop" ||
              state.lowPower ||
              !fine.matches ||
              !state.visible ||
              !state.inHero ||
              !state.heroReady ||
              !state.heroCalmReady ||
              state.heroPhase !== "FINAL_POSE" ||
              event.pointerType !== "mouse"
            ) {
              clearPointer();
              return;
            }
            Object.assign(state, {
              pointerX: Math.max(
                -1,
                Math.min(1, (event.clientX / innerWidth) * 2 - 1),
              ),
              pointerY: Math.max(
                -1,
                Math.min(1, 1 - (event.clientY / innerHeight) * 2),
              ),
              pointerActive: true,
            });
          };
          const visibility = () => {
            Object.assign(state, { visible: !document.hidden });
            if (document.hidden) {
              if (state.heroLifecycle === "PLAYING")
                Object.assign(state, { heroLifecycle: "SUSPENDED" });
              if (state.journeyLifecycle === "PLAYING")
                Object.assign(state, { journeyLifecycle: "SUSPENDED" });
            }
            syncJourneyText();
            clearPointer();
            traversal.update();
            requestUpdate();
          };
          window.addEventListener("scroll", requestUpdate, { passive: true });
          window.addEventListener("resize", refresh, { passive: true });
          window.addEventListener("pointermove", pointer, { passive: true });
          window.addEventListener("pointerleave", clearPointer);
          window.addEventListener("blur", clearPointer);
          fine.addEventListener("change", clearPointer);
          document.addEventListener("visibilitychange", visibility);
          element.addEventListener("load", refresh, true);
          const resize = new ResizeObserver(refresh);
          resize.observe(element);
          void document.fonts.ready.then(refresh);
          updatePresentation();
          syncJourneyText();
          return () => {
            disposed = true;
            if (journeyText)
              Object.assign(state, { journeyTextTime: journeyText.time() });
            journey.removeAttribute("data-lifecycle");
            journey.removeAttribute("data-phase");
            journey.style.removeProperty("--departure-portrait");
            cancelAnimationFrame(frame);
            cancelAnimationFrame(refreshFrame);
            resize.disconnect();
            journeyScroll?.destroy();
            traversal.destroy();
            gsap.ticker.remove(syncJourneyText);
            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", refresh);
            window.removeEventListener("pointermove", pointer);
            window.removeEventListener("pointerleave", clearPointer);
            window.removeEventListener("blur", clearPointer);
            fine.removeEventListener("change", clearPointer);
            document.removeEventListener("visibilitychange", visibility);
            element.removeEventListener("load", refresh, true);
          };
        },
      );
      return () => {
        mediaEvents.removeEventListener("matchMediaInit", rememberPosition);
        mediaEvents.removeEventListener("matchMedia", restorePosition);
        window.removeEventListener("scroll", trackPosition);
        mm.revert();
      };
    },
    { scope: root, dependencies: [root, canvasLayer] },
  );
  return {
    scene,
    active,
    scrolled,
    horsePresent,
    revealHero,
    updateSceneStatus,
  };
}
