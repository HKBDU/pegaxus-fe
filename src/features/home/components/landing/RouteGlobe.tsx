import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  getArc,
  getEuropeDots,
  getLandDots,
  getRoutePath,
  getRouteView,
  keyframe,
  project,
  RACING_HUBS,
  ROUTE_STOPS,
  type GlobeView,
} from "../../lib/route-globe";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const RAD = Math.PI / 180;
const ORANGE = "243 146 0";
const IVORY = "244 239 230";
const ARCS = RACING_HUBS.map((hub) => getArc(hub, ROUTE_STOPS[0]));
const CITIES = [
  { name: "BRUSSELS", lat: 50.85, lon: 4.35 },
  { name: "AMSTERDAM", lat: 52.37, lon: 4.9 },
  { name: "BORDEAUX", lat: 44.84, lon: -0.58 },
  { name: "GENEVA", lat: 46.2, lon: 6.14 },
  { name: "FRANKFURT", lat: 50.11, lon: 8.68 },
];
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

/**
 * One sticky globe behind "Routes in motion": scroll flies from the world's
 * racing hubs down onto Europe, then the Movement chapter (children) lands on
 * the same frame and the 3D horse runs London → Paris → Lyon along the route
 * drawn over the globe. Canvas 2D keeps the page to a single WebGL context.
 */
export function RouteGlobe({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(
    () => {
      const element = root.current;
      const surface = canvas.current;
      const context = surface?.getContext("2d");
      const movement = element?.querySelector<HTMLElement>("#movement");
      const overlay = movement?.querySelector<SVGSVGElement>(
        "[data-globe-overlay]",
      );
      if (!element || !surface || !context || !movement || !overlay) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          // matchMedia only runs when a condition matches; keep one always true.
          all: "all",
          reduced: "(prefers-reduced-motion: reduce)",
          compact: "(max-width: 767px)",
          lowPower: "(max-width: 1023px)",
        },
        (media) => {
          const { reduced, compact, lowPower } = media.conditions!;
          const dots = getLandDots(compact ? 2.8 : 2);
          const detail = getEuropeDots(compact ? 0.42 : 0.3);
          const proxy = { p: reduced ? 1 : 0 };
          const mono =
            getComputedStyle(element).getPropertyValue("--mono").trim() ||
            "monospace";
          let width = 0;
          let height = 0;
          let frame = 0;
          let onscreen = false;
          let routeView: GlobeView | undefined;
          const start = performance.now();

          const viewAt = (p: number, final: GlobeView): GlobeView => {
            const min = Math.min(width, height);
            const lat0 = keyframe(p, [
              [0, 12],
              [0.3, 20],
              [0.55, 30],
              [0.75, 46],
            ]);
            const lon0 = keyframe(p, [
              [0, 125],
              [0.3, 45],
              [0.55, -35],
              [0.75, 1],
            ]);
            const zoom = keyframe(p, [
              [0, compact ? 0.4 : 0.36],
              [0.5, compact ? 0.44 : 0.4],
              [0.75, compact ? 0.9 : 0.85],
            ]);
            const radius = min * zoom;
            const cx = width * (compact ? 0.5 : 0.56);
            const cy = height * (compact ? 0.56 : 0.54);
            // Final approach: ease the camera onto the route close-up.
            const t = smooth(clamp((p - 0.75) / 0.25));
            const lat = lat0 + (Math.asin(final.sinLat0) / RAD - lat0) * t;
            const lon = lon0 + (final.lon0 / RAD - lon0) * t;
            return {
              cx: cx + (final.cx - cx) * t,
              cy: cy + (final.cy - cy) * t,
              radius: radius * Math.pow(final.radius / radius, t),
              sinLat0: Math.sin(lat * RAD),
              cosLat0: Math.cos(lat * RAD),
              lon0: lon * RAD,
            };
          };

          const line = (
            view: GlobeView,
            points: Iterable<[number, number, number?]>,
          ) => {
            let pen = false;
            for (const [lat, lon, radius] of points) {
              const point = project(
                view,
                Math.sin(lat),
                Math.cos(lat),
                lon,
                radius,
              );
              const visible = radius ? point.visible : point.depth > 0;
              if (visible) {
                if (pen) context.lineTo(point.x, point.y);
                else context.moveTo(point.x, point.y);
                pen = true;
              } else pen = false;
            }
          };

          const draw = (now: number) => {
            if (!routeView || !width) return;
            const p = proxy.p;
            const time = reduced ? 0 : (now - start) / 1000;
            context.clearRect(0, 0, width, height);
            const min = Math.min(width, height);
            const base = viewAt(p, routeView);
            const drift = reduced ? 0 : Math.sin(time * 0.25) * 8 * (1 - p);
            const view = { ...base, lon0: base.lon0 + drift * RAD };
            const R = view.radius;
            const focus = clamp((p - 0.6) / 0.3);
            const close = clamp((R / min - 1.6) / 2.4);

            if (R < min * 3) {
              const glow = context.createRadialGradient(
                view.cx,
                view.cy,
                R * 0.92,
                view.cx,
                view.cy,
                R * 1.35,
              );
              glow.addColorStop(0, `rgb(${ORANGE} / 0.16)`);
              glow.addColorStop(1, `rgb(${ORANGE} / 0)`);
              context.fillStyle = glow;
              context.beginPath();
              context.arc(view.cx, view.cy, R * 1.35, 0, Math.PI * 2);
              context.fill();
            }
            const body = context.createRadialGradient(
              view.cx - R * 0.35,
              view.cy - R * 0.4,
              R * 0.1,
              view.cx,
              view.cy,
              R,
            );
            body.addColorStop(0, "#1d201d");
            body.addColorStop(1, "#0d0f0d");
            context.fillStyle = body;
            context.beginPath();
            context.arc(view.cx, view.cy, R, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = `rgb(${ORANGE} / 0.22)`;
            context.lineWidth = 1;
            context.stroke();

            // Graticule: 30° from afar, 5° once the camera is close.
            const grid = close > 0.5 ? 5 : 30;
            const sample = close > 0.5 ? 1 : 5;
            context.strokeStyle = `rgb(${IVORY} / ${0.05 + close * 0.03})`;
            context.beginPath();
            for (let meridian = -180; meridian < 180; meridian += grid) {
              const points: [number, number][] = [];
              for (let lat = -90; lat <= 90; lat += sample)
                points.push([lat * RAD, meridian * RAD]);
              line(view, points);
            }
            for (let parallel = -60; parallel <= 60; parallel += grid) {
              const points: [number, number][] = [];
              for (let lon = -180; lon <= 180; lon += sample)
                points.push([parallel * RAD, lon * RAD]);
              line(view, points);
            }
            context.stroke();

            // Land: world dots hand over to dense European dots up close.
            const drawDots = (
              set: typeof dots,
              size: number,
              strength: number,
            ) => {
              if (strength <= 0.01) return;
              for (const dot of set) {
                const point = project(view, dot.sinLat, dot.cosLat, dot.lon);
                if (
                  point.depth <= 0 ||
                  point.x < -size ||
                  point.y < -size ||
                  point.x > width + size ||
                  point.y > height + size
                )
                  continue;
                const alpha = (0.18 + point.depth * 0.55) * strength;
                context.fillStyle =
                  dot.europe && focus > 0
                    ? `rgb(${ORANGE} / ${alpha * (0.3 + focus * 0.5)})`
                    : `rgb(${IVORY} / ${alpha * (1 - focus * 0.45)})`;
                context.fillRect(
                  point.x - size / 2,
                  point.y - size / 2,
                  size,
                  size,
                );
              }
            };
            drawDots(dots, Math.max(1, Math.min(4, R * 0.0065)), 1 - close);
            drawDots(detail, compact ? 2.6 : 3, close);

            // Hub arcs draw in sequence, each with a travelling comet.
            const fade = 1 - focus * 0.85;
            ARCS.forEach((arc, index) => {
              const drawn = clamp((p - 0.06 - index * 0.04) / 0.2);
              if (drawn <= 0 || fade <= 0.02) return;
              const last = Math.max(1, Math.round(drawn * (arc.length - 1)));
              context.strokeStyle = `rgb(${ORANGE} / ${0.55 * fade})`;
              context.lineWidth = 1.2;
              context.beginPath();
              line(view, arc.slice(0, last + 1));
              context.stroke();
              if (reduced && drawn >= 1) return;
              const head =
                drawn < 1
                  ? last
                  : Math.floor(
                      ((time * 0.35 + index * 0.13) % 1) * (arc.length - 1),
                    );
              const [lat, lon, radius] = arc[head];
              const point = project(
                view,
                Math.sin(lat),
                Math.cos(lat),
                lon,
                radius,
              );
              if (!point.visible) return;
              context.fillStyle = `rgb(${ORANGE} / ${fade})`;
              context.beginPath();
              context.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
              context.fill();
              context.fillStyle = `rgb(${ORANGE} / ${0.18 * fade})`;
              context.beginPath();
              context.arc(point.x, point.y, 7, 0, Math.PI * 2);
              context.fill();
            });

            RACING_HUBS.forEach((hub, index) => {
              if (p < 0.06 + index * 0.04 || fade <= 0.02) return;
              const point = project(
                view,
                Math.sin(hub.lat * RAD),
                Math.cos(hub.lat * RAD),
                hub.lon * RAD,
              );
              if (point.depth <= 0) return;
              const pulse = reduced ? 0.5 : (time * 0.6 + index * 0.21) % 1;
              context.strokeStyle = `rgb(${ORANGE} / ${(1 - pulse) * 0.7 * fade})`;
              context.lineWidth = 1;
              context.beginPath();
              context.arc(point.x, point.y, 3 + pulse * 12, 0, Math.PI * 2);
              context.stroke();
              context.fillStyle = `rgb(${ORANGE} / ${fade})`;
              context.beginPath();
              context.arc(point.x, point.y, 2.4, 0, Math.PI * 2);
              context.fill();
            });

            // Neighbouring cities give the close-up scale; the overlay owns the route.
            if (close > 0.05) {
              context.font = `12px ${mono}`;
              context.fillStyle = `rgb(${IVORY} / ${close * 0.4})`;
              CITIES.forEach((city) => {
                const point = project(
                  view,
                  Math.sin(city.lat * RAD),
                  Math.cos(city.lat * RAD),
                  city.lon * RAD,
                );
                if (point.depth <= 0) return;
                context.fillRect(point.x - 2, point.y - 2, 4, 4);
                context.fillText(city.name, point.x + 8, point.y + 4);
              });
            }

            const [first, second] = lines.current;
            if (first)
              first.style.opacity = String(
                keyframe(p, [
                  [0.04, 0],
                  [0.12, 1],
                  [0.4, 1],
                  [0.48, 0],
                ]),
              );
            if (second)
              second.style.opacity = String(
                keyframe(p, [
                  [0.5, 0],
                  [0.58, 1],
                  [0.78, 1],
                  [0.86, 0],
                ]),
              );
          };

          const align = () => {
            // The route overlay only matches the canvas once Movement is in place.
            const top = movement.getBoundingClientRect().top;
            movement.toggleAttribute("data-aligned", Math.abs(top) <= 2);
          };
          const loop = (now: number) => {
            frame = 0;
            align();
            draw(now);
            if (!reduced && onscreen && !document.hidden && proxy.p < 0.999)
              frame = requestAnimationFrame(loop);
          };
          const schedule = () => {
            if (!frame) frame = requestAnimationFrame(loop);
          };
          const resize = () => {
            const ratio = Math.min(lowPower ? 1 : 2, devicePixelRatio || 1);
            width = surface.clientWidth;
            height = surface.clientHeight;
            if (!width || !height) return;
            surface.width = Math.round(width * ratio);
            surface.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            routeView = getRouteView(width, height, Boolean(compact));
            // The Movement overlay shares the canvas coordinate space.
            const { d, stops } = getRoutePath(routeView);
            overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
            overlay
              .querySelectorAll("[data-route-geometry]")
              .forEach((path) => path.setAttribute("d", d));
            overlay
              .querySelectorAll<SVGGElement>("[data-map-stop]")
              .forEach((group, index) => {
                const stop = stops[index];
                if (!stop) return;
                group.dataset.x = String(stop.x);
                group.dataset.y = String(stop.y);
                group.querySelectorAll("circle").forEach((circle) => {
                  circle.setAttribute("cx", String(stop.x));
                  circle.setAttribute("cy", String(stop.y));
                });
                const label = group.querySelector("text");
                label?.setAttribute("x", String(stop.x + 18));
                label?.setAttribute("y", String(stop.y + 5));
              });
            schedule();
          };
          const sizes = new ResizeObserver(resize);
          sizes.observe(surface);
          const visibility = new IntersectionObserver(([entry]) => {
            onscreen = entry?.isIntersecting ?? false;
            if (onscreen) schedule();
          });
          visibility.observe(element);
          const wake = () => {
            if (!document.hidden) schedule();
          };
          document.addEventListener("visibilitychange", wake);
          window.addEventListener("scroll", align, { passive: true });
          element.dataset.globe = reduced ? "static" : "scroll";
          if (!reduced)
            gsap.to(proxy, {
              p: 1,
              ease: "none",
              scrollTrigger: {
                trigger: element,
                start: "top top",
                endTrigger: movement,
                end: "top top",
                scrub: 0.8,
                onUpdate: schedule,
              },
            });
          resize();
          return () => {
            cancelAnimationFrame(frame);
            sizes.disconnect();
            visibility.disconnect();
            document.removeEventListener("visibilitychange", wake);
            window.removeEventListener("scroll", align);
            element.removeAttribute("data-globe");
            movement.removeAttribute("data-aligned");
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div className="landing-globe" ref={root}>
      <div className="landing-globe-stage">
        <canvas
          className="landing-globe-canvas"
          ref={canvas}
          aria-hidden="true"
        />
        <p className="landing-globe-copy">
          <span
            ref={(node) => {
              lines.current[0] = node;
            }}
          >
            From racing hubs on every continent,
          </span>
          <span
            ref={(node) => {
              lines.current[1] = node;
            }}
          >
            down to the border that matters next.
          </span>
        </p>
        <span className="landing-globe-caption" aria-hidden="true">
          ILLUSTRATIVE GLOBE · NOT LIVE TRACKING
        </span>
      </div>
      <div className="landing-globe-runway" aria-hidden="true" />
      {children}
    </div>
  );
}
