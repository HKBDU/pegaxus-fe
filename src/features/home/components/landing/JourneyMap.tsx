import { useId } from "react";

const route =
  "M180 123 C230 110 265 148 305 183 S392 246 440 274 S520 312 594 323";
export function JourneyMap() {
  const mask = "landing-route-" + useId().replace(/:/g, "");
  return (
    <div className="landing-journey-map">
      <svg
        viewBox="0 0 760 430"
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
              d={route}
              fill="none"
              stroke="white"
              strokeWidth="18"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              data-route-reveal
            />
          </mask>
        </defs>
        <rect width="760" height="430" fill={"url(#" + mask + "-grid)"} />
        <g
          className="landing-map-land"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
        >
          <path d="M122 34 150 27 166 56 187 68 181 91 204 108 194 137 160 147 143 126 123 131 130 105 108 94 120 73 108 59Z" />
          <path d="M80 67 106 63 113 91 95 110 77 106 69 87Z" />
          <path d="M263 140 321 128 339 100 381 108 402 84 446 98 468 75 500 91 533 79 560 102 603 98 641 130 672 124 698 153 676 184 709 221 681 239 691 268 655 286 660 313 632 330 610 305 588 315 574 287 553 273 555 243 530 239 515 270 486 281 494 305 478 326 455 299 435 293 435 325 407 340 377 332 358 354 319 349 300 320 280 300 287 274 264 255 255 228 268 206 246 185 251 165Z" />
          <path d="M390 352 424 342 436 365 423 383 389 376Z" />
        </g>
        <path d={route} className="landing-map-route-underlay" />
        <g mask={"url(#" + mask + ")"}>
          <path d={route} className="landing-map-route" data-route-flow />
        </g>
        <g className="landing-map-stops">
          <circle cx="180" cy="123" r="5" />
          <circle cx="305" cy="183" r="5" />
          <circle cx="594" cy="323" r="6" />
          <text x="146" y="103">
            LONDON
          </text>
          <text x="319" y="178">
            PARIS
          </text>
          <text x="610" y="329">
            LYON
          </text>
        </g>
        <text className="landing-map-coordinate" x="30" y="403">
          EUROPE / A JOURNEY IN CONTEXT
        </text>
      </svg>
    </div>
  );
}
