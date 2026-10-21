import { useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HORSE_CHAPTERS, type LandingChapter } from "../lib/landing-navigation";
import { createMapTraversal } from "../lib/map-traversal";
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
  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      const mm = gsap.matchMedia();
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
            heroCompleted: state.heroCompleted,
            heroPhase: state.heroPhase,
            journeyCompleted: state.journeyCompleted,
            journeyTravel: state.journeyTravel,
            journeyDistance: state.journeyDistance,
            mapProgress: state.mapProgress,
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
          // A breakpoint change never restarts a partially played gait in another composition.
          if (state.heroPhase !== "LOADING")
            Object.assign(state, { heroCompleted: true, introX: 0, introZ: 0 });
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
          const traversal = createMapTraversal(map, state);
          const progressFill = element.querySelector<HTMLElement>(
            ".landing-scroll-progress > span",
          );
          let lastPresent: boolean | undefined;
          let lastScrolled: boolean | undefined;
          let currentShot = "";
          let frame = 0;
          let refreshFrame = 0;
          let disposed = false;
          let restorePending = resumeJourney || resumeMap;

          const updatePresentation = () => {
            if (restorePending) return;
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
            // A navbar-covered sliver of Hero must not steal Journey anchor reentry.
            const inHero = heroRect.bottom > (profile === "desktop" ? 80 : 75);
            const inJourney =
              !inHero &&
              journeyRect.bottom > 0 &&
              journeyRect.top < innerHeight;
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
              if (currentShot === "home" && !inHero)
                Object.assign(state, {
                  heroCompleted: true,
                  introX: 0,
                  introZ: 0,
                });
              if (currentShot === "journey")
                Object.assign(state, { journeyCompleted: true });
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
            const stageTop =
              layer?.getBoundingClientRect().top ??
              (inMap || profile === "desktop" ? 0 : 75);
            const stageHeight =
              layer?.clientHeight ??
              (inMap || profile === "desktop"
                ? innerHeight
                : innerHeight * 0.43);
            const rect = inHero ? heroRect : inMap ? mapRect : journeyRect;
            const offset = inHero
              ? rect.top
              : inMap
                ? 0
                : Math.max(0, rect.top) +
                  Math.min(0, rect.bottom - stageTop - stageHeight);
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
              stageOffsetY: offset,
              clipTop,
              clipBottom,
              journeyReady:
                inJourney &&
                clipTop < stageHeight * 0.12 &&
                clipBottom < stageHeight * 0.12 &&
                offset < stageHeight * 0.12,
            });
            if (inHero && !present)
              Object.assign(state, {
                heroCompleted: true,
                introX: 0,
                introZ: 0,
              });
            if (layer) {
              layer.style.setProperty("--scene-offset-y", offset + "px");
              layer.style.clipPath =
                "inset(" + clipTop + "px 0 " + clipBottom + "px)";
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
          const refresh = () => {
            if (refreshFrame || disposed) return;
            refreshFrame = requestAnimationFrame(() => {
              refreshFrame = 0;
              if (!disposed) {
                ScrollTrigger.refresh();
                if (restorePending) {
                  restorePending = false;
                  if (resumeJourney)
                    window.scrollTo({
                      top: journey.getBoundingClientRect().top + scrollY,
                      behavior: "instant",
                    });
                  if (resumeMap) traversal.restore(previous.mapProgress);
                }
                updatePresentation();
              }
            });
          };

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
            if (section.id === "journey") {
              gsap.from(section.querySelectorAll(".landing-stage-line li"), {
                y: 14,
                opacity: 0,
                stagger: 0.14,
                duration: 0.65,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section.querySelector(".landing-stage-line"),
                  start: "top 92%",
                  once: true,
                },
              });
              gsap.fromTo(
                section.querySelector(".landing-journey-perspective"),
                { opacity: 0.15, y: 35 },
                {
                  opacity: 0.45,
                  y: -15,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                  },
                },
              );
            }
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
            if (copy)
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
            Object.assign(state, { pointerX: 0, pointerY: 0 });
          const fine = matchMedia("(hover: hover) and (pointer: fine)");
          const pointer = (event: PointerEvent) => {
            if (
              reduced ||
              profile !== "desktop" ||
              state.lowPower ||
              !fine.matches ||
              !state.inHero ||
              state.heroPhase !== "FINAL_POSE" ||
              event.pointerType !== "mouse"
            )
              return;
            Object.assign(state, {
              pointerX: (event.clientX / innerWidth) * 2 - 1,
              pointerY: 1 - (event.clientY / innerHeight) * 2,
            });
          };
          const visibility = () => {
            Object.assign(state, { visible: !document.hidden });
            clearPointer();
            traversal.update();
            requestUpdate();
          };
          window.addEventListener("scroll", requestUpdate, { passive: true });
          window.addEventListener("resize", refresh, { passive: true });
          window.addEventListener("pointermove", pointer, { passive: true });
          window.addEventListener("pointerleave", clearPointer);
          document.addEventListener("visibilitychange", visibility);
          element.addEventListener("load", refresh, true);
          const resize = new ResizeObserver(refresh);
          resize.observe(element);
          void document.fonts.ready.then(refresh);
          if (restorePending) {
            if (canvasLayer.current) canvasLayer.current.style.opacity = "0";
            refresh();
          } else updatePresentation();
          return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            cancelAnimationFrame(refreshFrame);
            resize.disconnect();
            traversal.destroy();
            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", refresh);
            window.removeEventListener("pointermove", pointer);
            window.removeEventListener("pointerleave", clearPointer);
            document.removeEventListener("visibilitychange", visibility);
            element.removeEventListener("load", refresh, true);
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [root, canvasLayer] },
  );
  return { scene, active, scrolled, horsePresent };
}
