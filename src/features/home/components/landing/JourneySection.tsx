import departure from "../../assets/journey-departure.jpg";

const stages = ["Planning", "Legal & health", "Border crossing", "Arrival"];

export function JourneySection() {
  return (
    <section
      id="journey"
      className="landing-chapter landing-journey"
      aria-labelledby="journey-title"
    >
      <figure className="landing-departure-photo" data-media-reveal>
        <div className="landing-photo-frame">
          <img
            src={departure}
            alt="Grooms leading racehorses out of a stable"
            width="1280"
            height="853"
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>THE DEPARTURE / Photography: Tom Fisk · Pexels</figcaption>
      </figure>
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
        A NEW PERSPECTIVE / THE JOURNEY BEGINS
      </span>
    </section>
  );
}
