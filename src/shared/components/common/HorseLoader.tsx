import { useId, useState } from "react";
import animationUrl from "@/assets/horse-loader-run.webp?url&no-inline";
import poseUrl from "@/assets/horse-loader-pose.webp?inline";
import { cn } from "@/lib/utils";
import "./HorseLoader.css";

type LoaderSize = "button" | "inline" | "panel" | "page";

function Track({ size }: { size: LoaderSize }) {
  const gradientId = useId();
  const compact = size === "button" || size === "inline";
  const radius = compact ? 168 : 106;
  const stroke = size === "button" ? 14 : size === "inline" ? 6 : 2;
  const point = (degrees: number) => {
    const angle = (degrees * Math.PI) / 180;
    return [224 + radius * Math.sin(angle), 224 - radius * Math.cos(angle)];
  };
  const start = point(-50);
  const join = point(-20);
  const end = point(0);
  const arc = (from: number[], to: number[]) =>
    `M ${from.join(" ")} A ${radius} ${radius} 0 0 1 ${to.join(" ")}`;

  return (
    <svg
      viewBox="0 0 448 448"
      focusable="false"
      className="pegaxus-horse-loader-track absolute inset-0 size-full"
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={start[0]}
          y1={start[1]}
          x2={join[0]}
          y2={join[1]}
        >
          <stop stopColor="#F39200" stopOpacity="0" />
          <stop offset="0.65" stopColor="#F39200" stopOpacity="0.5" />
          <stop offset="1" stopColor="#F39200" />
        </linearGradient>
      </defs>
      <circle
        cx="224"
        cy="224"
        r={radius}
        pathLength="360"
        stroke="#F39200"
        strokeOpacity="0.25"
        strokeWidth={stroke}
        strokeDasharray="3 5"
      />
      <g
        className="pegaxus-horse-loader-trail"
        strokeWidth={stroke * 1.3}
        strokeLinecap="round"
      >
        <path d={arc(start, join)} stroke={`url(#${gradientId})`} />
        <path d={arc(join, end)} stroke="#F39200" />
      </g>
    </svg>
  );
}

export function HorseLoader({
  size = "panel",
  label = "Loading your journey...",
  className,
}: {
  size?: LoaderSize;
  label?: string;
  className?: string;
}) {
  const [asset, setAsset] = useState<"pending" | "ready" | "fallback">(
    "pending",
  );
  const compact = size === "button" || size === "inline";

  return (
    <div
      role="status"
      aria-live="polite"
      data-size={size}
      data-asset={compact ? "compact" : asset}
      className={cn(
        "pegaxus-horse-loader inline-flex max-w-full items-center justify-center gap-3",
        !compact && "flex-col text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pegaxus-horse-loader-scene relative inline-block shrink-0"
      >
        <Track size={size} />
        {size !== "button" && (
          <img
            src={poseUrl}
            alt=""
            className="pegaxus-horse-loader-placeholder"
          />
        )}
        {!compact && (
          <picture className="pegaxus-horse-loader-animation absolute inset-0 block size-full">
            <source media="(prefers-reduced-motion: reduce)" srcSet={poseUrl} />
            <img
              src={animationUrl}
              alt=""
              width="448"
              height="448"
              decoding="async"
              fetchPriority="low"
              className="block size-full object-contain"
              onLoad={(event) =>
                setAsset(
                  event.currentTarget.currentSrc.startsWith("data:")
                    ? "pending"
                    : "ready",
                )
              }
              onError={() => setAsset("fallback")}
            />
          </picture>
        )}
      </span>
      <span
        className={cn(
          "max-w-full text-sm text-slate-500",
          size === "button" && "sr-only",
        )}
      >
        {label}
      </span>
    </div>
  );
}
