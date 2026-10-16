export function GlobalMovementSection() {
  return (
    <section
      id="movement"
      className="landing-chapter landing-movement"
      aria-labelledby="movement-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">05 / Beyond borders</p>
        <h2 id="movement-title">
          International
          <br />
          transport,
          <br />
          <em>
            without losing
            <br />
            control.
          </em>
        </h2>
        <p className="landing-lead">
          Different destinations. Different requirements. One place to connect
          the preparation and coordination.
        </p>
        <div
          className="landing-route"
          aria-label="Illustrative cross-border route, not service coverage"
        >
          <span>
            Origin<small>THE START</small>
          </span>
          <div aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>
            Destination<small>THE NEXT CHAPTER</small>
          </span>
        </div>
        <p className="landing-caption">
          An illustration of the journey. Not a live route or coverage map.
        </p>
      </div>
    </section>
  );
}
