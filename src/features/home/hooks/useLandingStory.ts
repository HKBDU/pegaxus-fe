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
          Object.assign(scene.current, createLandingStory(profile, reduced), {
            visible: !document.hidden,
            lowPower:
              profile !== "desktop" ||
              (navigator.hardwareConcurrency > 0 &&
                navigator.hardwareConcurrency <= 4),
          });
          const sections = HORSE_CHAPTERS.map((id) =>
            element.querySelector<HTMLElement>("#" + id)!,
          );
          let lastPresent = true;
          let lastScrolled = window.scrollY > 32;
          let lastActive: LandingChapter | null = null;
          setScrolled(lastScrolled);
          const syncPresence = () => {
            const presence = scene.current.horsePresence;
            if (canvasLayer.current)
              canvasLayer.current.style.opacity = String(presence);
            const present = presence > 0.001;
            if (present !== lastPresent) {
              lastPresent = present;
              setHorsePresent(present);
            }
          };
          setHorsePresent(true);
          syncPresence();
          const updateNavigation = (index: number) => {
            // Care/Movement are chapters of the Platform navigation destination.
            const chapter = HORSE_CHAPTERS[index];
            const next =
              chapter === "care" || chapter === "movement"
                ? "platform"
                : chapter;
            if (next !== lastActive) {
              lastActive = next;
              setActive(next);
            }
            if (reduced) {
              scene.current.horsePresence = shots[chapter].horsePresence;
              syncPresence();
            }
          };
          let cues: MotionCue[] = [];
          let cueIndex = 0;
          const syncStory = () => {
            if ((scene.current.rawProgress ?? 0) <= 0.15) {
              scene.current.motion = "idle";
            } else {
              cueIndex = resolveMotionCue(master.progress(), cues, cueIndex, 0.02);
              if (cues[cueIndex]) scene.current.motion = cues[cueIndex].motion;
            }
            syncPresence();
          };
          const master = gsap.timeline({
            paused: true,
            defaults: { ease: "none" },
            onUpdate: syncStory,
          });
          const buildStory = () => {
            const frames: { at: number; shot: HorseShot }[] = [
              // Hero composition
              { at: 0, shot: { ...shots.home, horsePresence: 1 } },
              // 6. Cinematic handoff: Hero horse softly fades out at Journey entry
              { at: 0.04, shot: { ...shots.home, horsePresence: 0 } },
              // Scene/camera handoff to Journey while hidden
              { at: 0.08, shot: { ...shots.journey, horsePresence: 0 } },
              // Horse softly fades in at Journey composition
              { at: 0.13, shot: { ...shots.journey, horsePresence: 1 } },
              {
                at: 0.25,
                shot: {
                  ...shots.journey,
                  horseX:
                    profile === "desktop"
                      ? -0.9
                      : profile === "tablet"
                        ? -0.6
                        : -0.15,
                },
              },
              { at: 0.40, shot: shots.compliance },
              { at: 0.50, shot: shots.compliance },
              {
                at: 0.60,
                shot: { ...shots.platform, horsePresence: 1 },
              },
              { at: 0.68, shot: shots.platform },
              {
                at: 0.75,
                shot: { ...shots.care, horsePresence: 0 },
              },
              { at: 0.82, shot: shots.care },
              { at: 0.88, shot: shots.care },
              { at: 0.92, shot: shots.movement },
              {
                at: 0.96,
                shot: {
                  ...shots.movement,
                  horseX:
                    profile === "desktop"
                      ? 0.25
                      : profile === "tablet"
                        ? 0.3
                        : -0.1,
                },
              },
              {
                at: 0.99,
                shot: { ...shots.about, horsePresence: 0 },
              },
              { at: 1.0, shot: { ...shots.about, horsePresence: 0 } },
            ];
            cues = [
              { at: 0, motion: "idle" },
              // Cross-fade idle -> walk while hidden during Journey handoff
              { at: 0.06, motion: "walk" },
              { at: 0.40, motion: "idle" },
              { at: 0.88, motion: "walk" },
              { at: 0.93, motion: "run" },
            ];
            master.clear();
            Object.assign(scene.current, shots.home);
            let previous = 0;
            for (const frame of frames.slice(1)) {
              const { motion: _motion, ...targets } = frame.shot;
              master.to(
                scene.current,
                { ...targets, duration: Math.max(0.001, frame.at - previous) },
                previous,
              );
              previous = frame.at;
            }
          };
          if (!reduced) {
            buildStory();
            const proxy = { progress: 0 };
            const scrubTween = gsap.to(proxy, {
              progress: 1,
              ease: "none",
              onUpdate: () => {
                const rawProgress = proxy.progress;
                scene.current.rawProgress = rawProgress;

                // 4. Scroll Threshold / Deadzone (0% -> 15%) & Post-Hero Locomotion (> 15%)
                const storyProgress = Math.max(0, (rawProgress - 0.15) / 0.85);
                scene.current.storyProgress = storyProgress;

                if (rawProgress <= 0.15) {
                  master.progress(0);
                  scene.current.motion = "idle";
                  scene.current.playbackRate = 0.6;
                } else {
                  master.progress(storyProgress);
                }
                syncPresence();
              },
            });

            ScrollTrigger.create({
              id: "landing-master",
              trigger: element,
              start: "top top",
              end: "bottom bottom",
              animation: scrubTween,
              scrub: 0.45,
              onRefreshInit: buildStory,
              onRefresh: syncStory,
              onUpdate: (self) => {
                if (self.progress > 0.15) {
                  scene.current.playbackRate = getPlaybackRate(
                    self.getVelocity(),
                  );
                } else {
                  scene.current.playbackRate = 0.6;
                }
                scene.current.lastScrollAt = performance.now();
                const next = self.scroll() > 32;
                if (next !== lastScrolled) {
                  lastScrolled = next;
                  setScrolled(next);
                }
              },
            });
          } else {
            // Static camera/pose; only presence follows the current content chapter.
            ScrollTrigger.create({
              trigger: element,
              start: "top top",
              end: "bottom bottom",
              onUpdate: (self) => setScrolled(self.scroll() > 32),
            });
          }
          sections.forEach((section, index) => {
            ScrollTrigger.create({
              trigger: section,
              start: "top center",
              end: "bottom center",
              onToggle: (self) => {
                if (self.isActive) updateNavigation(index);
              },
            });
            const copy = section.querySelector("[data-reveal]");
            if (!copy) return;
            const targets = copy.querySelectorAll(
              ":scope > .landing-eyebrow, :scope > h1, :scope > h2, :scope > .landing-lead, :scope > .landing-actions, .landing-journey-stages > li, .landing-document-lines > div, .landing-pillars > article, :scope > .landing-route, :scope > .landing-caption",
            );
            gsap.from(targets, {
              opacity: 0,
              y: reduced ? 0 : 22,
              duration: reduced ? 0.25 : 0.65,
              stagger: reduced ? 0 : 0.09,
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
                    trigger: "#movement",
                    start: "top 65%",
                    end: "bottom 80%",
                    scrub: 0.45,
                  },
                },
              );
            element
              .querySelectorAll(
                ".landing-outline-wordmark, .landing-final-wordmark",
              )
              .forEach((wordmark) => {
                gsap.to(wordmark, {
                  yPercent: -12,
                  ease: "none",
                  scrollTrigger: {
                    trigger: wordmark.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.45,
                  },
                });
              });
          }
          const fine = matchMedia("(pointer: fine)");
          const pointer = (event: PointerEvent) => {
            if (
              reduced ||
              profile !== "desktop" ||
              scene.current.lowPower ||
              !fine.matches ||
              event.pointerType !== "mouse"
            )
              return;
            scene.current.pointerX =
              (event.clientX / window.innerWidth) * 2 - 1;
            scene.current.pointerY =
              (event.clientY / window.innerHeight) * 2 - 1;
          };
          const clearPointer = () => {
            scene.current.pointerX = 0;
            scene.current.pointerY = 0;
          };
          const visibility = () => {
            scene.current.visible = !document.hidden;
            clearPointer();
          };
          window.addEventListener("pointermove", pointer, { passive: true });
          window.addEventListener("pointerleave", clearPointer);
          document.addEventListener("visibilitychange", visibility);
          // Font loading can change chapter boundaries without a viewport resize.
          let disposed = false;
          void document.fonts.ready.then(() => {
            if (!disposed) ScrollTrigger.refresh();
          });
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
