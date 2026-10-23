const stages = ["Planning", "Legal & health", "Border crossing", "Arrival"];

export function JourneySection() {
  return (
    <section
      id="journey"
      className="landing-chapter landing-journey"
      aria-labelledby="journey-title"
    >
      <div className="landing-departure-stage" aria-hidden="true">
        <span className="landing-departure-atmosphere" />
        <svg viewBox="0 0 640 700" focusable="false">
          <path
            className="landing-departure-gate is-rear"
            d="M147 616V190L326 102L506 190V616L478 630V210L326 136L175 210V630Z"
          />
          <path
            className="landing-departure-gate"
            d="M61 657V137L316 20L579 137V657L542 674V163L316 59L98 163V674Z"
          />
          <path
            className="landing-departure-edge"
            d="M98 326V163L316 59L542 163V326"
          />
        </svg>
        <span className="landing-departure-sweep" />
        <span className="landing-departure-spotlight" />
      </div>
      <div className="landing-journey-perspective" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">02 / The departure</p>
        <h2 id="journey-title">
          <span data-journey-headline>Every great journey begins with </span>
          <em>a single step.</em>
        </h2>
        <p className="landing-lead">
          Before a border is crossed, there is a horse to prepare. A route to
          consider. People who need the same clear picture.
        </p>
        <ol
          className="landing-stage-line"
          aria-label="Journey preparation stages"
        >
          {stages.map((stage, index) => (
            <li key={stage}>
              <span>0{index + 1}</span>
              {stage}
            </li>
          ))}
        </ol>
        <p className="landing-caption">
          Thoughtful preparation. Connected from the beginning.
        </p>
      </div>
      <span className="landing-shot-caption" aria-hidden="true">
        FORWARD, WITH PURPOSE / THE JOURNEY BEGINS
      </span>
    </section>
  );
}
