const stages = ["Planning", "Legal & health", "Border crossing", "Arrival"];

export function JourneySection() {
  return (
    <section
      id="journey"
      className="landing-chapter landing-journey"
      aria-labelledby="journey-title"
    >
      <div className="landing-journey-perspective" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">02 / The departure</p>
        <h2 id="journey-title">
          Every great journey begins with <em>a single step.</em>
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
