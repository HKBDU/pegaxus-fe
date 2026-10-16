import { Link } from "react-router-dom";
import { TransportLink } from "./LandingActions";

export function FinalCtaSection() {
  return (
    <section
      id="about"
      className="landing-chapter landing-final"
      aria-labelledby="final-title"
    >
      <div className="landing-final-copy" data-reveal>
        <p className="landing-eyebrow">
          PEGAXUS / A considered approach to movement
        </p>
        <h2 id="final-title">
          Move with
          <br />
          <em>confidence.</em>
        </h2>
        <p className="landing-lead">
          Cross-border coordination for every journey.
          <br />
          Built around the horse. Connected by the details.
        </p>
        <div className="landing-actions">
          <TransportLink final />
          <Link className="landing-text-link" to="/login">
            Sign in <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <span className="landing-final-wordmark" aria-hidden="true">
        PEGAXUS
      </span>
    </section>
  );
}
