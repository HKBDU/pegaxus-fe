import { ArrowDownRight } from "lucide-react";
import { TransportLink } from "./LandingActions";

export function HeroSection() {
  return (
    <section
      id="home"
      className="landing-chapter landing-hero"
      aria-labelledby="landing-hero-title"
    >
      <div className="landing-hero-coordinate" aria-hidden="true">
        PRECISION IN EVERY JOURNEY / 01
      </div>
      <div className="landing-copy landing-hero-copy">
        <p className="landing-eyebrow">
          <span /> Cross-border racehorse transport
        </p>
        <h1 id="landing-hero-title">
          Move champions
          <br />
          <em>beyond borders.</em>
        </h1>
        <p className="landing-lead">
          A single platform for planning, compliance and international
          coordination built around the horse.
        </p>
        <div className="landing-actions">
          <TransportLink />
          <a className="landing-text-link" href="#journey">
            Explore the journey <ArrowDownRight aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="landing-hero-bottom">
        <a href="#journey" className="landing-scroll-cue">
          <span aria-hidden="true" /> Scroll to discover
        </a>
        <span className="landing-hero-caption">
          The horse comes first.
          <br />
          Every detail follows.
        </span>
      </div>
      <div className="landing-outline-wordmark" aria-hidden="true">
        PEGAXUS
      </div>
    </section>
  );
}
