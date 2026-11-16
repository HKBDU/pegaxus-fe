/** Oversized outlined chapter number drifting behind a section (parallax in useLandingMotion). */
export function ChapterNumber({
  value,
  side = "right",
}: {
  value: string;
  side?: "left" | "right";
}) {
  return (
    <span
      className={`landing-chapter-number is-${side}`}
      aria-hidden="true"
      data-chapter-number
    >
      {value}
    </span>
  );
}
