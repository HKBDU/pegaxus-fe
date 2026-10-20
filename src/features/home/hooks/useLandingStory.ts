import { useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HORSE_CHAPTERS, type LandingChapter } from "../lib/landing-navigation";
import { getPlaybackRate } from "../lib/horse-animation";
import {
  createLandingStory,
  getHorseShots,
  resolveMotionCue,
  type HorseShot,
  type MotionCue,
  type StoryProfile,
} from "../lib/horse-story";

export type { LandingSceneState } from "../lib/horse-story";
gsap.registerPlugin(ScrollTrigger, useGSAP);

export function useLandingStory(
  root: RefObject<HTMLDivElement | null>,
  canvasLayer: RefObject<HTMLDivElement | null>,
) {
  const scene = useRef(createLandingStory("mobile", true));
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
        },
        (context) => {
          const conditions = context.conditions!;
          const profile: StoryProfile = conditions.desktop
            ? "desktop"
            : conditions.tablet
              ? "tablet"
              : "mobile";
          const reduced = Boolean(conditions.reduced);
          const shots = getHorseShots(profile, reduced);
          const state = scene.current;
          const previous = {
            heroCompleted: state.heroCompleted,
            heroPhase: state.heroPhase,
            introX: state.introX,
            introZ: state.introZ,
            shotVersion: state.shotVersion + 1,
            invalidate: state.invalidate,
          };
          Object.assign(state, createLandingStory(profile, reduced), previous, {
            visible: !document.hidden,
            lowPower:
              profile !== "desktop" ||
              (navigator.hardwareConcurrency > 0 &&
                navigator.hardwareConcurrency <= 4),
          });
          if (previous.heroPhase === "LOADING" && !previous.heroCompleted) {
            const initial = createLandingStory(profile, reduced);
            Object.assign(state, {
              introX: initial.introX,
              introZ: initial.introZ,
            });
          }
          const sections = HORSE_CHAPTERS.map((id) =>
            element.querySelector<HTMLElement>("#" + id)!,
          );
          const hero = sections[0];
          const journey = sections[1];
          let lastPresent = true;
          let lastScrolled = false;
          let lastActive: LandingChapter | null = null;
          const shot = { ...shots.journey };
          let cueIndex = 0;
          const cues: MotionCue[] = [
            { at: 0, motion: "walk" },
            { at: 0.3, motion: "idle" },
            { at: 0.86, motion: "walk" },
            { at: 0.94, motion: "run" },
          ];

          const updatePresentation = () => {
            const heroRect = hero.getBoundingClientRect();
            const journeyRect = journey.getBoundingClientRect();
            const layer = canvasLayer.current;
            const compact = profile !== "desktop";
            const stageTop =
              layer?.getBoundingClientRect().top ?? (compact ? 75 : 0);
            const stageHeight =
              layer?.clientHeight ??
              (compact ? innerHeight * 0.43 : innerHeight);
            const inHero = heroRect.bottom > 0;
            if (state.inHero !== inHero) {
              Object.assign(state, {
                inHero,
                shotVersion: state.shotVersion + 1,
                heroCompleted: true,
                introX: 0,
                introZ: 0,
              });
              Object.assign(state, inHero ? shots.home : shot);
            }
            // The Hero stage moves with the document, not through opacity or pinning.
            const offset = inHero ? heroRect.top : Math.max(0, journeyRect.top);
            const sectionTop = inHero ? heroRect.top : journeyRect.top;
            const sectionBottom = inHero
              ? heroRect.bottom
              : element.getBoundingClientRect().bottom;
            const clipTop = Math.max(
              0,
              Math.min(stageHeight, sectionTop - stageTop),
            );
            const clipBottom = Math.max(
              0,
              Math.min(stageHeight, stageTop + stageHeight - sectionBottom),
            );
            Object.assign(state, { stageOffsetY: offset, clipTop, clipBottom });
            const stageOnscreen =
              offset + stageTop + stageHeight > 0 &&
              offset + stageTop < innerHeight &&
              clipTop + clipBottom < stageHeight;
            if (inHero && !stageOnscreen && !state.heroCompleted)
              Object.assign(state, {
                heroCompleted: true,
                introX: 0,
                introZ: 0,
              });
            const presence = inHero ? 1 : state.horsePresence;
            if (layer) {
              layer.style.setProperty("--scene-offset-y", offset + "px");
              layer.style.clipPath =
                "inset(" + clipTop + "px 0 " + clipBottom + "px)";
              layer.style.opacity = String(presence);
            }
            const present = stageOnscreen && presence > 0.001;
            if (lastPresent !== present) {
              lastPresent = present;
              setHorsePresent(present);
            }
            const nextScrolled = scrollY > 32;
            if (lastScrolled !== nextScrolled) {
              lastScrolled = nextScrolled;
              setScrolled(nextScrolled);
            }
            state.invalidate?.();
          };
          const syncStory = () => {
            cueIndex = resolveMotionCue(
              master.progress(),
              cues,
              cueIndex,
              0.015,
            );
            shot.motion = reduced ? "idle" : cues[cueIndex].motion;
            if (!state.inHero) Object.assign(state, shot);
            updatePresentation();
          };
          const master = gsap.timeline({
            paused: true,
            defaults: { ease: "none" },
            onUpdate: syncStory,
          });
          const frames: { at: number; shot: HorseShot }[] = [
            {
              at: 0.18,
              shot: {
                ...shots.journey,
                horseX: reduced
                  ? shots.journey.horseX
                  : profile === "desktop"
                    ? -0.9
                    : -0.15,
              },
            },
            { at: 0.34, shot: shots.compliance },
            { at: 0.46, shot: shots.compliance },
            { at: 0.56, shot: { ...shots.platform, horsePresence: 1 } },
            { at: 0.65, shot: shots.platform },
            { at: 0.72, shot: { ...shots.care, horsePresence: 0 } },
            { at: 0.8, shot: shots.care },
            { at: 0.86, shot: shots.care },
            { at: 0.92, shot: shots.movement },
            {
              at: 0.96,
              shot: {
                ...shots.movement,
                horseX: reduced
                  ? shots.movement.horseX
                  : profile === "desktop"
                    ? 0.25
                    : -0.1,
              },
            },
            { at: 1, shot: { ...shots.about, horsePresence: 0 } },
          ];
          let previousAt = 0;
          for (const frame of frames) {
            const { motion: _motion, ...targets } = frame.shot;
            master.to(
              shot,
              { ...targets, duration: frame.at - previousAt },
              previousAt,
            );
            previousAt = frame.at;
          }
          ScrollTrigger.create({
            id: "landing-story",
            trigger: journey,
            start: "top top",
            endTrigger: element,
            end: "bottom bottom",
            animation: master,
            scrub: reduced ? true : 0.45,
            onUpdate: (self) => {
              Object.assign(state, {
                playbackRate: reduced ? 1 : getPlaybackRate(self.getVelocity()),
                lastScrollAt: performance.now(),
                storyProgress: self.progress,
                rawProgress: self.progress,
              });
            },
          });
          ScrollTrigger.create({
            id: "landing-bounds",
            trigger: element,
            start: "top top",
            end: "bottom bottom",
            onUpdate: updatePresentation,
            onRefresh: updatePresentation,
          });
          sections.forEach((section, index) => {
            ScrollTrigger.create({
              trigger: section,
              start: "top center",
              end: "bottom center",
              onToggle: (self) => {
                if (!self.isActive) return;
                const chapter = HORSE_CHAPTERS[index];
                const next =
                  chapter === "care" || chapter === "movement"
                    ? "platform"
                    : chapter;
                if (lastActive !== next) {
                  lastActive = next;
                  setActive(next);
                }
              },
            });
            const copy = section.querySelector("[data-reveal]");
            if (!copy) return;
            const targets = copy.querySelectorAll(
              ":scope > .landing-eyebrow, :scope > h1, :scope > h2, :scope > .landing-lead, :scope > .landing-actions, .landing-journey-stages > li, .landing-document-lines > div, .landing-pillars > article, :scope > .landing-route, :scope > .landing-caption",
            );
            if (!reduced)
              gsap.from(targets, {
                opacity: 0,
                y: 22,
                duration: 0.65,
                stagger: 0.09,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: copy,
                  start: section.id === "platform" ? "top 45%" : "top 78%",
                  once: true,
                },
              });
          });
          if (!reduced) {
            const route = element.querySelector(".landing-route > div");
            if (route)
              gsap.fromTo(
                route,
                { "--route-progress": 0 },
                {
                  "--route-progress": 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: sections[5],
                    start: "top 65%",
                    end: "bottom 80%",
                    scrub: 0.45,
                  },
                },
              );
          }
          const fine = matchMedia("(hover: hover) and (pointer: fine)");
          const clearPointer = () =>
            Object.assign(state, { pointerX: 0, pointerY: 0 });
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
          };
          window.addEventListener("pointermove", pointer, { passive: true });
          window.addEventListener("pointerleave", clearPointer);
          document.addEventListener("visibilitychange", visibility);
          let disposed = false;
          void document.fonts.ready.then(() => {
            if (!disposed) ScrollTrigger.refresh();
          });
          updatePresentation();
          return () => {
            disposed = true;
            master.kill();
            window.removeEventListener("pointermove", pointer);
            window.removeEventListener("pointerleave", clearPointer);
            document.removeEventListener("visibilitychange", visibility);
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [root, canvasLayer] },
  );
  return { scene, active, scrolled, horsePresent };
}
