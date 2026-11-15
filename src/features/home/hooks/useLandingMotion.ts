import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Editorial motion layered on top of the horse story: split headings, the
 * Compliance dossier sequence, the Platform card fan-out, Care spotlights and
 * a scroll-velocity marquee. Every effect keeps its static markup as the final
 * state, so reduced motion simply skips the animation.
 */
export function useLandingMotion(root: RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          // matchMedia only runs when a condition matches; keep one always true.
          all: "all",
          desktop: "(min-width: 1024px)",
          sequence: "(min-width: 1024px) and (min-height: 640px)",
          tall: "(min-width: 1024px) and (min-height: 780px)",
          reduced: "(prefers-reduced-motion: reduce)",
          fine: "(hover: hover) and (pointer: fine)",
        },
        (media) => {
          const { desktop, sequence, tall, reduced, fine } = media.conditions!;
          if (reduced) return;
          const cleanups: (() => void)[] = [];

          // 1. Headings rise word by word from behind a line mask.
          element
            .querySelectorAll<HTMLElement>("h2[data-split]")
            .forEach((heading) => {
              const strike = heading.querySelector(".landing-strike");
              const split = SplitText.create(heading, {
                type: strike ? "lines,words,chars" : "lines,words",
                mask: "lines",
                autoSplit: true,
                onSplit: (self) => {
                  const timeline = gsap.timeline({
                    scrollTrigger: {
                      trigger: heading,
                      start: "top 85%",
                      once: true,
                    },
                  });
                  timeline.from(self.words, {
                    yPercent: 115,
                    rotation: 4,
                    duration: 0.9,
                    stagger: 0.06,
                    ease: "power4.out",
                  });
                  if (!strike) return timeline;
                  // Care: the struck word drifts apart into ghosted particles,
                  // then "A champion." lifts letter by letter and glows.
                  const random = gsap.utils.random;
                  timeline
                    .set(self.masks, { overflow: "visible" }, 1.4)
                    .to(
                      self.chars.filter((char) => strike.contains(char)),
                      {
                        x: () => random(-26, 26),
                        y: () => random(-34, -6),
                        rotation: () => random(-45, 45),
                        scale: 0.8,
                        opacity: 0.18,
                        filter: "blur(1.5px)",
                        duration: 1.2,
                        stagger: { each: 0.05, from: "random" },
                        ease: "power2.out",
                      },
                      1.5,
                    )
                    .to(
                      self.chars.filter((char) => char.closest("em")),
                      {
                        keyframes: { y: [-14, 0] },
                        duration: 0.55,
                        stagger: 0.04,
                        ease: "power2.out",
                      },
                      1.9,
                    )
                    .to(
                      heading.querySelector("em"),
                      {
                        textShadow: "0 0 32px rgb(243 146 0 / 55%)",
                        duration: 0.9,
                      },
                      2.2,
                    );
                  return timeline;
                },
              });
              cleanups.push(() => split.revert());
            });
          element
            .querySelectorAll<HTMLElement>(".landing-strike")
            .forEach((strike) =>
              gsap.fromTo(
                strike,
                { "--strike": 0 },
                {
                  "--strike": 1,
                  duration: 0.7,
                  delay: 0.65,
                  ease: "power3.inOut",
                  scrollTrigger: {
                    trigger: strike,
                    start: "top 85%",
                    once: true,
                  },
                },
              ),
            );

          // 2. Compliance: pages settle, requirements tick off, a revision is
          //    resubmitted and a rubber stamp approves the dossier three times.
          const compliance = element.querySelector<HTMLElement>("#compliance");
          const stack = compliance?.querySelector<HTMLElement>(
            "[data-dossier-stack]",
          );
          const composition = compliance?.querySelector<HTMLElement>(
            ".landing-document-composition",
          );
          if (compliance && stack && composition) {
            const query = <T extends Element = HTMLElement>(selector: string) =>
              gsap.utils.toArray<T>(selector, compliance);
            const pages = query("[data-dossier-page]");
            const rows = query("[data-dossier-row]");
            const imprints = query("[data-dossier-imprint]");
            const statuses = query("[data-dossier-status]");
            const tool =
              compliance.querySelector<HTMLElement>("[data-stamp-tool]");
            const count = compliance.querySelector("[data-dossier-count]");
            const scatter = [
              [-340, -260, 220, -50, 30, -40],
              [380, -200, 320, 40, -35, 28],
              [-420, 180, 160, 60, 20, 18],
              [300, 260, 260, -35, -25, -30],
              [-260, 320, 300, 45, -15, 22],
              [40, -380, 420, 70, 10, 12],
            ];
            const from = (index: number, axis: number) =>
              scatter[index % scatter.length][axis];
            // Imprint centre in the composition's own box (the tool's anchor).
            const point = (index: number) => {
              const box = composition.getBoundingClientRect();
              const mark = imprints[index].getBoundingClientRect();
              return {
                x: mark.left + mark.width / 2 - box.left,
                y: mark.top + mark.height / 2 - box.top,
              };
            };
            const tickRow = (row: HTMLElement, at: number) =>
              timeline
                .fromTo(
                  row.querySelector("[data-dossier-tick]"),
                  { strokeDashoffset: 1 },
                  { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" },
                  at,
                )
                .fromTo(
                  row.querySelector("[data-dossier-label]"),
                  { opacity: 0, x: -8 },
                  { opacity: 1, x: 0, duration: 0.35 },
                  at + 0.2,
                );

            if (sequence) compliance.dataset.sequence = "on";
            const timeline = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: sequence
                ? {
                    trigger: compliance,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.7,
                    invalidateOnRefresh: true,
                  }
                : { trigger: compliance, start: "top 70%", once: true },
            });
            timeline
              .from(pages, {
                x: (index: number) => from(index, 0),
                y: (index: number) => from(index, 1),
                z: (index: number) => from(index, 2),
                rotationX: (index: number) => from(index, 3),
                rotationY: (index: number) => from(index, 4),
                rotationZ: (index: number) => from(index, 5),
                opacity: 0,
                duration: 3.2,
                stagger: 0.3,
              })
              .fromTo(
                stack,
                { rotationX: 52, rotationZ: -18, scale: 0.92 },
                { rotationX: 22, rotationZ: -6, scale: 1, duration: 2 },
                3.4,
              )
              .from(
                "[data-dossier-v1]",
                { x: -180, y: 70, rotation: -28, opacity: 0, duration: 1.2 },
                4.2,
              );

            // Requirements tick off; the health certificate waits for its revision.
            [0, 2, 3, 4].forEach((row, index) =>
              tickRow(rows[row], 5 + index * 0.4),
            );
            timeline
              .fromTo(
                compliance.querySelector("[data-dossier-progress]"),
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0.2, duration: 1.6, ease: "none" },
                5,
              )
              // innerText tweens survive scrub refreshes that suppress callbacks.
              .fromTo(
                count,
                { innerText: 0 },
                {
                  innerText: 4,
                  snap: { innerText: 1 },
                  duration: 1.6,
                  ease: "none",
                },
                5,
              )
              .from(
                "[data-dossier-note]",
                {
                  scale: 1.7,
                  rotation: 40,
                  opacity: 0,
                  duration: 0.5,
                  ease: "back.out(2.2)",
                },
                6.8,
              )
              .from(
                "[data-dossier-v2]",
                {
                  x: 260,
                  y: -50,
                  rotation: 16,
                  opacity: 0,
                  duration: 0.9,
                  ease: "power3.out",
                },
                7.5,
              );
            tickRow(rows[1], 8.4);
            timeline
              .to(
                compliance.querySelector("[data-dossier-progress]"),
                { strokeDashoffset: 0, duration: 0.4, ease: "none" },
                8.4,
              )
              .to(
                count,
                {
                  innerText: 5,
                  snap: { innerText: 1 },
                  duration: 0.4,
                  ease: "none",
                },
                8.4,
              );

            // Three slams: Document approved → Submitted → Authority approved.
            if (tool) {
              gsap.set(tool, { xPercent: -50, yPercent: -100, "--spin": 0 });
              imprints.forEach((imprint, index) => {
                const at = 9.2 + index * 1.5;
                const ink = imprint.querySelectorAll("[data-dossier-ink]");
                timeline
                  .to(
                    tool,
                    {
                      x: () => point(index).x,
                      y: () => point(index).y - 120,
                      rotation: -8,
                      "--spin": index + 1,
                      opacity: 1,
                      duration: 0.7,
                      ease: "power2.inOut",
                    },
                    at,
                  )
                  .to(
                    tool,
                    {
                      y: () => point(index).y + 6,
                      rotation: 0,
                      duration: 0.2,
                      ease: "power4.in",
                    },
                    at + 0.7,
                  )
                  .fromTo(
                    imprint,
                    { opacity: 0, scale: 1.35 },
                    { opacity: 0.88, scale: 1, duration: 0.12, ease: "none" },
                    at + 0.88,
                  )
                  .fromTo(
                    ink,
                    { scale: 0 },
                    {
                      scale: 1,
                      duration: 0.3,
                      stagger: 0.03,
                      ease: "back.out(3)",
                    },
                    at + 0.9,
                  )
                  .fromTo(
                    composition,
                    { x: 0, y: 0 },
                    {
                      keyframes: { x: [-8, 7, -5, 3, 0], y: [6, -5, 3, -1, 0] },
                      duration: 0.35,
                      ease: "none",
                    },
                    at + 0.9,
                  )
                  .fromTo(
                    statuses[index],
                    { opacity: 0, y: 6 },
                    { opacity: 1, y: 0, duration: 0.25 },
                    at + 0.95,
                  )
                  .to(
                    tool,
                    {
                      y: () => point(index).y - 120,
                      duration: 0.4,
                      ease: "power2.out",
                    },
                    at + 1.05,
                  );
                if (index > 0)
                  timeline.to(
                    statuses[index - 1],
                    { opacity: 0, y: -6, duration: 0.25 },
                    at + 0.9,
                  );
              });
              timeline.to(
                tool,
                {
                  x: "+=180",
                  y: "-=220",
                  rotation: 18,
                  opacity: 0,
                  duration: 0.9,
                  ease: "power2.in",
                },
                9.2 + imprints.length * 1.5,
              );
            }
            if (!sequence) timeline.timeScale(3);
            cleanups.push(() => {
              compliance.removeAttribute("data-sequence");
              if (count) count.textContent = "5";
            });
          }

          // 3. Platform: mini-UI cards fan out of the dashboard and wire data into it.
          const platform = element.querySelector<HTMLElement>("#platform");
          const stage = platform?.querySelector<HTMLElement>(
            "[data-platform-stage]",
          );
          const front = platform?.querySelector<HTMLElement>(
            "[data-platform-front]",
          );
          if (platform && stage && front) {
            const cards = gsap.utils.toArray<HTMLElement>(
              "[data-platform-card]",
              platform,
            );
            const wires = gsap.utils.toArray<SVGGElement>(
              "[data-platform-wire]",
              platform,
            );
            const svg = platform.querySelector("[data-platform-wires]");
            const panel = platform.querySelector<HTMLElement>(
              ".landing-platform-window",
            );
            // Layout boxes (offset*) ignore the transforms GSAP is animating.
            const wire = () => {
              if (!svg || !desktop) return;
              svg.setAttribute(
                "viewBox",
                `0 0 ${stage.offsetWidth} ${stage.offsetHeight}`,
              );
              const left = front.offsetLeft;
              const right = left + front.offsetWidth;
              cards.forEach((card, index) => {
                const west = card.offsetLeft < left;
                const sx = west
                  ? card.offsetLeft + card.offsetWidth
                  : card.offsetLeft;
                const sy = card.offsetTop + card.offsetHeight / 2;
                const ex = west ? left : right;
                const ey =
                  front.offsetTop + front.offsetHeight * (0.3 + index * 0.2);
                const mx = (sx + ex) / 2;
                const d = `M${sx} ${sy} C${mx} ${sy} ${mx} ${ey} ${ex} ${ey}`;
                wires[index]
                  ?.querySelectorAll("path")
                  .forEach((path) => path.setAttribute("d", d));
              });
            };
            wire();
            const observer = new ResizeObserver(wire);
            observer.observe(stage);

            const counts = gsap.utils.toArray<HTMLElement>(
              "[data-platform-count]",
              platform,
            );
            const toCentre =
              (axis: "x" | "y") => (_: number, card: HTMLElement) =>
                axis === "x"
                  ? front.offsetLeft +
                    front.offsetWidth / 2 -
                    (card.offsetLeft + card.offsetWidth / 2)
                  : front.offsetTop +
                    front.offsetHeight / 2 -
                    (card.offsetTop + card.offsetHeight / 2);

            if (tall) platform.dataset.sequence = "on";
            const timeline = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: tall
                ? {
                    trigger: platform,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.8,
                    invalidateOnRefresh: true,
                  }
                : { trigger: panel ?? platform, start: "top 70%", once: true },
            });
            timeline.fromTo(
              stage,
              { rotationX: 34, y: 50, scale: 0.86 },
              { rotationX: 0, y: 0, scale: 1, duration: 1.2 },
              0,
            );
            if (desktop)
              timeline.from(
                cards,
                {
                  x: toCentre("x"),
                  y: toCentre("y"),
                  z: -220,
                  scale: 0.45,
                  rotationY: (index: number) => (index === 1 ? -40 : 40),
                  opacity: 0,
                  duration: 1.4,
                  stagger: 0.25,
                },
                0.8,
              );
            else
              timeline.from(
                cards,
                { y: 50, opacity: 0, duration: 0.9, stagger: 0.15 },
                0.6,
              );
            timeline
              .from(
                platform.querySelectorAll("[data-platform-pop]"),
                { x: -12, opacity: 0, duration: 0.5, stagger: 0.12 },
                1.8,
              )
              .fromTo(
                counts,
                {
                  innerText: (_: number, el: HTMLElement) =>
                    Number(el.dataset.from),
                },
                {
                  innerText: (_: number, el: HTMLElement) =>
                    Number(el.dataset.platformCount),
                  snap: { innerText: 1 },
                  duration: 1.5,
                  ease: "power2.out",
                },
                1.9,
              )
              .fromTo(
                platform.querySelector("[data-platform-route]"),
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0, duration: 1, ease: "power1.inOut" },
                2,
              )
              .fromTo(
                platform.querySelector("[data-platform-runner]"),
                { attr: { cx: 18, cy: 72 }, opacity: 0 },
                {
                  keyframes: [
                    { opacity: 1, duration: 0.1 },
                    { attr: { cx: 98, cy: 24 }, duration: 0.6 },
                    { attr: { cx: 140, cy: 42 }, duration: 0.5 },
                  ],
                  ease: "none",
                },
                2,
              )
              .fromTo(
                platform.querySelector("[data-platform-bar]"),
                { scaleX: 0 },
                {
                  scaleX: 1,
                  transformOrigin: "left center",
                  duration: 1.4,
                  ease: "power2.out",
                },
                2.1,
              );
            if (desktop)
              timeline
                .fromTo(
                  wires,
                  { opacity: 0 },
                  { opacity: 1, duration: 0.6, stagger: 0.2 },
                  2.6,
                )
                // Data lands: each card nudges in, then the dashboard pulses.
                .to(
                  cards,
                  {
                    keyframes: {
                      x: [0, (index: number) => (index === 1 ? -14 : 14), 0],
                    },
                    duration: 0.6,
                    stagger: 0.12,
                    ease: "power2.inOut",
                  },
                  3.3,
                )
                .fromTo(
                  front,
                  { scale: 1 },
                  {
                    keyframes: { scale: [1.025, 1] },
                    duration: 0.6,
                    ease: "power2.out",
                  },
                  3.7,
                );
            if (!tall) timeline.timeScale(2);
            cleanups.push(() => {
              observer.disconnect();
              platform.removeAttribute("data-sequence");
              counts.forEach((el) => {
                el.textContent = el.dataset.platformCount ?? "";
              });
            });

            const tilt = platform.querySelector<HTMLElement>(
              "[data-platform-tilt]",
            );
            if (desktop && fine && tilt && panel) {
              const rotateX = gsap.quickTo(tilt, "rotationX", {
                duration: 0.6,
                ease: "power3",
              });
              const rotateY = gsap.quickTo(tilt, "rotationY", {
                duration: 0.6,
                ease: "power3",
              });
              const move = (event: PointerEvent) => {
                const box = panel.getBoundingClientRect();
                rotateY(((event.clientX - box.left) / box.width - 0.5) * 6);
                rotateX(-((event.clientY - box.top) / box.height - 0.5) * 5);
              };
              const leave = () => {
                rotateX(0);
                rotateY(0);
              };
              panel.addEventListener("pointermove", move);
              panel.addEventListener("pointerleave", leave);
              cleanups.push(() => {
                panel.removeEventListener("pointermove", move);
                panel.removeEventListener("pointerleave", leave);
                gsap.set(tilt, { clearProps: "transform" });
              });
            }
          }

          // 4. Care: a lens follows the pointer and reveals the colour photograph.
          if (desktop && fine)
            element
              .querySelectorAll<HTMLElement>("[data-spotlight]")
              .forEach((frame) => {
                frame.dataset.spotlightOn = "true";
                const enter = () =>
                  gsap.to(frame, {
                    "--spot-r": "140px",
                    duration: 0.5,
                    ease: "power3.out",
                  });
                const leave = () =>
                  gsap.to(frame, {
                    "--spot-r": "0px",
                    duration: 0.45,
                    ease: "power3.in",
                  });
                const layer = frame.querySelector<HTMLElement>(
                  ".landing-spotlight-layer",
                );
                const move = (event: PointerEvent) => {
                  if (!layer) return;
                  // The layer is scaled and parallax-shifted; map into its own box.
                  const box = layer.getBoundingClientRect();
                  const scaleX = layer.offsetWidth / (box.width || 1);
                  const scaleY = layer.offsetHeight / (box.height || 1);
                  frame.style.setProperty(
                    "--spot-x",
                    `${(event.clientX - box.left) * scaleX}px`,
                  );
                  frame.style.setProperty(
                    "--spot-y",
                    `${(event.clientY - box.top) * scaleY}px`,
                  );
                };
                frame.addEventListener("pointerenter", enter);
                frame.addEventListener("pointerleave", leave);
                frame.addEventListener("pointermove", move);
                cleanups.push(() => {
                  frame.removeEventListener("pointerenter", enter);
                  frame.removeEventListener("pointerleave", leave);
                  frame.removeEventListener("pointermove", move);
                  frame.removeAttribute("data-spotlight-on");
                  ["--spot-r", "--spot-x", "--spot-y"].forEach((name) =>
                    frame.style.removeProperty(name),
                  );
                });
              });

          // 4b. Care: photos tilt in, a heartbeat draws, health log vitals count up.
          const care = element.querySelector<HTMLElement>("#care");
          if (care) {
            gsap.utils
              .toArray<HTMLElement>("[data-care-tilt]", care)
              .forEach((frame, index) =>
                gsap.fromTo(
                  frame,
                  { rotationY: index ? -18 : 16, rotationX: 8, scale: 0.94 },
                  {
                    rotationY: 0,
                    rotationX: 0,
                    scale: 1,
                    ease: "none",
                    scrollTrigger: {
                      trigger: frame,
                      start: "top bottom",
                      end: "center 55%",
                      scrub: 0.8,
                    },
                  },
                ),
              );
            const ecg = care.querySelector("[data-care-ecg]");
            if (ecg)
              gsap.fromTo(
                ecg,
                { strokeDashoffset: 1 },
                {
                  strokeDashoffset: 0,
                  ease: "none",
                  scrollTrigger: {
                    trigger: care,
                    start: "top 75%",
                    end: "bottom 75%",
                    scrub: 0.6,
                  },
                },
              );
            const log = care.querySelector<HTMLElement>("[data-care-log]");
            if (log) {
              const vitals = gsap.utils.toArray<HTMLElement>(
                "[data-care-vital]",
                log,
              );
              const timeline = gsap.timeline({
                scrollTrigger: { trigger: log, start: "top 82%", once: true },
              });
              timeline.from(log, {
                y: 40,
                rotationX: -25,
                transformPerspective: 900,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
              });
              vitals.forEach((vital) => {
                const target = Number(vital.dataset.careVital);
                const digits = Number(vital.dataset.digits);
                // Temperature climbs from a plausible reading, counts from zero.
                const box = { value: digits ? Math.floor(target) - 3 : 0 };
                timeline.to(
                  box,
                  {
                    value: target,
                    duration: 1.4,
                    ease: "power2.out",
                    onUpdate: () => {
                      vital.textContent = box.value.toFixed(digits);
                    },
                  },
                  0.3,
                );
              });
              cleanups.push(() =>
                vitals.forEach((vital) => {
                  vital.textContent = Number(vital.dataset.careVital).toFixed(
                    Number(vital.dataset.digits),
                  );
                }),
              );
            }
          }

          // 4c. Reliability finish line: milestones complete, the receipt is signed
          //     and stamped, then the records fly into the audit pack.
          const finish = element.querySelector<HTMLElement>("[data-finish]");
          if (finish) {
            const milestones = gsap.utils.toArray<HTMLElement>(
              "[data-finish-milestone]",
              finish,
            );
            const timeline = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: {
                trigger: finish,
                start: "top 80%",
                end: desktop ? "bottom 55%" : "bottom 70%",
                scrub: 0.7,
              },
            });
            timeline.fromTo(
              "[data-finish-fill]",
              { width: "0%" },
              { width: "100%", duration: 4, ease: "none" },
              0,
            );
            milestones.forEach((milestone, index) =>
              timeline
                .fromTo(
                  milestone,
                  { opacity: 0.35 },
                  { opacity: 1, duration: 0.3 },
                  index,
                )
                .fromTo(
                  milestone.querySelector("i"),
                  { scale: 0.55, backgroundColor: "#d9d0c2" },
                  {
                    scale: 1,
                    backgroundColor: "#f39200",
                    duration: 0.35,
                    ease: "back.out(3)",
                  },
                  index,
                ),
            );
            timeline
              .from(
                "[data-finish-receipt]",
                { y: 40, rotation: -3, opacity: 0, duration: 0.8 },
                2.6,
              )
              .fromTo(
                "[data-finish-signature]",
                { strokeDashoffset: 1 },
                { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" },
                3,
              )
              .from(
                "[data-finish-complete]",
                {
                  scale: 2.4,
                  rotation: -32,
                  opacity: 0,
                  duration: 0.3,
                  ease: "power4.in",
                },
                4.1,
              )
              .fromTo(
                "[data-finish-receipt]",
                { x: 0 },
                {
                  keyframes: { x: [-5, 4, -2, 0] },
                  duration: 0.3,
                  ease: "none",
                },
                4.4,
              )
              .from(
                "[data-finish-pack]",
                { y: 40, opacity: 0, duration: 0.7 },
                4.3,
              )
              .from(
                "[data-finish-file]",
                {
                  x: (index: number) => -240 - index * 30,
                  y: (index: number) => -110 + index * 20,
                  rotation: (index: number) => (index % 2 ? 14 : -12),
                  opacity: 0,
                  duration: 0.8,
                  stagger: 0.18,
                  ease: "power3.inOut",
                },
                4.7,
              )
              .fromTo(
                "[data-finish-zip]",
                { scale: 1 },
                {
                  keyframes: { scale: [1.25, 1] },
                  duration: 0.4,
                  ease: "power2.out",
                },
                5.9,
              );
          }

          // 4d. Chapter numbers drift against the scroll for depth.
          element
            .querySelectorAll<HTMLElement>("[data-chapter-number]")
            .forEach((number) =>
              gsap.fromTo(
                number,
                { yPercent: 35 },
                {
                  yPercent: -35,
                  ease: "none",
                  scrollTrigger: {
                    trigger: number.closest("section"),
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                },
              ),
            );

          // 4e. Closing: the photograph drifts, the panel and side columns rise.
          const closing =
            element.querySelector<HTMLElement>(".landing-closing");
          if (closing) {
            gsap.fromTo(
              closing.querySelector("[data-closing-photo]"),
              { yPercent: -10 },
              {
                yPercent: 0,
                ease: "none",
                scrollTrigger: {
                  trigger: closing,
                  start: "top bottom",
                  end: "bottom bottom",
                  scrub: true,
                },
              },
            );
            gsap.from(
              [
                closing.querySelector("[data-closing-panel]"),
                ...closing.querySelectorAll("[data-closing-side]"),
              ],
              {
                y: 70,
                opacity: 0,
                duration: 1.1,
                stagger: 0.12,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: closing.querySelector("[data-closing-panel]"),
                  start: "top 92%",
                  once: true,
                },
              },
            );
          }

          // 5. Marquee: speed and lean follow scroll velocity; direction follows scroll.
          const band = element.querySelector<HTMLElement>(
            ".landing-marquee-band",
          );
          const track = band?.querySelector<HTMLElement>(
            ".landing-marquee-track",
          );
          if (band && track) {
            const loops = band.querySelectorAll(".landing-marquee-loop");
            let boost = 0;
            let target = 0;
            let direction = 1;
            const tick = () => {
              target *= 0.9;
              boost += (target - boost) * 0.12;
              const animation = track.getAnimations()[0];
              if (animation) animation.playbackRate = direction * (1 + boost);
              gsap.set(loops, {
                skewX: -direction * Math.min(12, boost * 2.2),
              });
            };
            const trigger = ScrollTrigger.create({
              trigger: band,
              start: "top bottom",
              end: "bottom top",
              onUpdate: (self) => {
                target = Math.min(6, Math.abs(self.getVelocity()) / 350);
                direction = self.direction;
              },
              onToggle: (self) => {
                if (self.isActive) gsap.ticker.add(tick);
                else gsap.ticker.remove(tick);
              },
            });
            cleanups.push(() => {
              trigger.kill();
              gsap.ticker.remove(tick);
              const animation = track.getAnimations()[0];
              if (animation) animation.playbackRate = 1;
              gsap.set(loops, { clearProps: "transform" });
            });
          }

          // Sticky Compliance changes page height; recompute the story once.
          requestAnimationFrame(() => ScrollTrigger.refresh());
          return () => cleanups.forEach((cleanup) => cleanup());
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [root] },
  );
}
