import { JourneyMap } from "./JourneyMap";

export function GlobalMovementSection() {
  return (
    <section
      id="movement"
      className="landing-chapter landing-movement"
      aria-labelledby="movement-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">06 / Routes in motion</p>
        <h2 id="movement-title">
          Across borders.
          <br />
          <em>With clarity.</em>
        </h2>
        <p className="landing-lead">
          Different countries. Different requirements. Keep route preparation
          and the next destination connected.
        </p>
      </div>
      <JourneyMap />
      <p className="landing-map-caption">
        Symbolic journey · Illustrative route, not live tracking or service
        coverage.
      </p>
    </section>
  );
}
