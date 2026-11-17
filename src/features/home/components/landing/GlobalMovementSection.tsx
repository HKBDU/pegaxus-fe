import { ChapterNumber } from "./ChapterNumber";
import { useId } from "react";

const STOPS = ["LONDON", "PARIS", "LYON"];
// Placeholder geometry; RouteGlobe replaces it with the projected globe route.
const PLACEHOLDER = "M0 0 L1 1";

export function GlobalMovementSection() {
  const mask = "landing-route-" + useId().replace(/:/g, "");
  return (
    <section
      id="movement"
      className="landing-chapter landing-movement"
      aria-labelledby="movement-title"
    >
      <ChapterNumber value="06" side="left" />
      <svg
        className="landing-globe-route"
        data-globe-overlay
        viewBox="0 0 1 1"
        role="img"
        aria-label="Illustrative journey on the globe from London through Paris to Lyon, not a live shipment"
        preserveAspectRatio="none"
      >
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse">
            <path
              d={PLACEHOLDER}
              fill="none"
              stroke="white"
              strokeWidth="26"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              data-route-geometry
              data-route-reveal
            />
          </mask>
        </defs>
        <path
          d={PLACEHOLDER}
          className="landing-map-route-underlay"
          data-route-geometry
        />
        <g mask={"url(#" + mask + ")"}>
          <path
            d={PLACEHOLDER}
            className="landing-map-route-completed"
            data-route-geometry
          />
          <path
            d={PLACEHOLDER}
            className="landing-map-route"
            data-route-geometry
            data-route-flow
            data-horse-route
          />
        </g>
        <g className="landing-map-stops">
          {STOPS.map((name) => (
            <g key={name} data-map-stop data-x="0" data-y="0">
              <circle className="landing-stop-halo" cx="0" cy="0" r="16" />
              <circle cx="0" cy="0" r="6" />
              <text x="0" y="0">
                {name}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">06 / Routes in motion</p>
        <h2 id="movement-title" data-split>
          Across borders.
          <br />
          <em>With clarity.</em>
        </h2>
        <p className="landing-lead">
          Different countries. Different requirements. Keep route preparation
          and the next destination connected.
        </p>
      </div>
      <button type="button" className="landing-map-skip" data-map-skip hidden>
        Skip route animation
      </button>
      <p className="landing-map-caption">
        Symbolic journey · Illustrative route, not live tracking or service
        coverage.
      </p>
    </section>
  );
}
