import { useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HORSE_CHAPTERS, type LandingChapter } from "../lib/landing-navigation";
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
          const state = scene.current;
          const previous = {
            heroCompleted: state.heroCompleted,
            heroPhase: state.heroPhase,
            journeyCompleted: state.journeyCompleted || state.inJourney,
            journeyTravel: state.journeyTravel,
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
          const sections = HORSE_CHAPTERS.map((id) =>
            element.querySelector<HTMLElement>("#" + id)!,
          );
          const hero = sections[0];
          const journey = sections[1];
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
            const heroRect = hero.getBoundingClientRect();
            const journeyRect = journey.getBoundingClientRect();
            const inHero = heroRect.bottom > 0;
            const inJourney =
              !inHero &&
              journeyRect.bottom > 0 &&
              journeyRect.top < innerHeight;
            const nextShot = inHero ? "home" : inJourney ? "journey" : "none";
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
              Object.assign(state, inJourney ? shots.journey : shots.home, {
                inHero,
                inJourney,
                horsePresence: nextShot === "none" ? 0 : 1,
                shotVersion: state.shotVersion + 1,
              });
            }
            const layer = canvasLayer.current;
            const stageTop =
              layer?.getBoundingClientRect().top ??
              (profile === "desktop" ? 0 : 75);
            const stageHeight =
              layer?.clientHeight ??
              (profile === "desktop" ? innerHeight : innerHeight * 0.43);
            const rect = inHero ? heroRect : journeyRect;
            const offset = inHero
              ? rect.top
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
            Object.assign(state, { stageOffsetY: offset, clipTop, clipBottom });
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
          const map = element.querySelector("#movement");
          const routes = element.querySelectorAll("[data-route-flow]");
          const routeLoop =
            !reduced && routes.length
              ? gsap.to(routes, {
                  strokeDashoffset: -36,
                  duration: 1.5,
                  repeat: -1,
                  ease: "none",
                  paused: true,
                })
              : null;
          let mapVisible = false;
          const syncMap = () => {
            map?.toggleAttribute(
              "data-route-active",
              mapVisible && !document.hidden,
            );
            if (mapVisible && !document.hidden) routeLoop?.play();
            else routeLoop?.pause();
          };
          if (map && !reduced) {
            gsap.fromTo(
              element.querySelectorAll("[data-route-reveal]"),
              { attr: { "stroke-dashoffset": 1 } },
              {
                attr: { "stroke-dashoffset": 0 },
                ease: "none",
                scrollTrigger: {
                  trigger: map,
                  start: "top 85%",
                  end: "center 60%",
                  scrub: 0.5,
                },
              },
            );
            ScrollTrigger.create({
              trigger: map,
              start: "top bottom",
              end: "bottom top",
              onToggle: (self) => {
                mapVisible = self.isActive;
                syncMap();
              },
            });
          }
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
            syncMap();
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
          updatePresentation();
          return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            cancelAnimationFrame(refreshFrame);
            resize.disconnect();
            routeLoop?.kill();
            map?.removeAttribute("data-route-active");
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
