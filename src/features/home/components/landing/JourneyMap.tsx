import { useId, useSyncExternalStore } from "react";

const route =
  "M180 123 C230 110 265 148 305 183 S392 246 440 274 S520 312 594 323";
const subscribe = (notify: () => void) => {
  const media = matchMedia("(max-width: 767px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const compactSnapshot = () => matchMedia("(max-width: 767px)").matches;
export function JourneyMap() {
  const mask = "landing-route-" + useId().replace(/:/g, "");
  const compact = useSyncExternalStore(subscribe, compactSnapshot, () => false);
  const curve = compact
    ? "M95 100 C80 165 130 210 180 265 S285 350 310 450"
    : route;
  const stops = compact
    ? [
        { name: "LONDON", x: 95, y: 100 },
        { name: "PARIS", x: 180, y: 265 },
        { name: "LYON", x: 310, y: 450 },
      ]
    : [
        { name: "LONDON", x: 180, y: 123 },
        { name: "PARIS", x: 305, y: 183 },
        { name: "LYON", x: 594, y: 323 },
      ];
  return (
    <div className="landing-journey-map">
      <svg
        viewBox={compact ? "0 0 430 580" : "0 0 760 430"}
        role="img"
        aria-label="Illustrative journey from London through Paris to Lyon, not a live shipment"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id={mask + "-grid"}
            width="38"
            height="38"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M38 0H0V38"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".08"
            />
          </pattern>
          <mask id={mask}>
            <path
              d={curve}
              fill="none"
              stroke="white"
              strokeWidth="22"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              data-route-reveal
            />
          </mask>
        </defs>
        <rect
          width={compact ? 430 : 760}
          height={compact ? 580 : 430}
          fill={"url(#" + mask + "-grid)"}
        />
        <g
          className="landing-map-land"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
          transform={compact ? "translate(-10 -65) scale(.6 1.6)" : undefined}
        >
          <path d="M122 34 150 27 166 56 187 68 181 91 204 108 194 137 160 147 143 126 123 131 130 105 108 94 120 73 108 59Z" />
          <path d="M80 67 106 63 113 91 95 110 77 106 69 87Z" />
          <path d="M263 140 321 128 339 100 381 108 402 84 446 98 468 75 500 91 533 79 560 102 603 98 641 130 672 124 698 153 676 184 709 221 681 239 691 268 655 286 660 313 632 330 610 305 588 315 574 287 553 273 555 243 530 239 515 270 486 281 494 305 478 326 455 299 435 293 435 325 407 340 377 332 358 354 319 349 300 320 280 300 287 274 264 255 255 228 268 206 246 185 251 165Z" />
          <path d="M390 352 424 342 436 365 423 383 389 376Z" />
        </g>
        <path d={curve} className="landing-map-route-underlay" />
        <g mask={"url(#" + mask + ")"}>
          <path d={curve} className="landing-map-route-completed" />
          <path
            d={curve}
            className="landing-map-route"
            data-route-flow
            data-horse-route
          />
        </g>
        <g className="landing-map-stops">
          {stops.map((stop) => (
            <g key={stop.name} data-map-stop data-x={stop.x} data-y={stop.y}>
              <circle cx={stop.x} cy={stop.y} r="5" />
              <text
                x={compact ? stop.x + 35 : stop.x - 25}
                y={compact ? stop.y + 8 : stop.y + 38}
              >
                {stop.name}
              </text>
            </g>
          ))}
        </g>
        <text className="landing-map-coordinate" x="30" y="403">
          EUROPE / A JOURNEY IN CONTEXT
        </text>
      </svg>
    </div>
  );
}
