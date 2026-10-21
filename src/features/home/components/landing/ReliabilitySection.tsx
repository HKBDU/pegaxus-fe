import { CustomerPreview } from "./CustomerPreview";

export function ReliabilitySection() {
  return (
    <section
      id="reliability"
      className="landing-chapter landing-reliability"
      aria-labelledby="reliability-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">07 / The proof of care</p>
        <h2 id="reliability-title">
          Every arrival
          <br />
          <em>matters.</em>
        </h2>
        <p className="landing-lead">
          A journey is more than a change of place. It is a record of
          preparation, coordination and arrival, kept together.
        </p>
        <p className="landing-caption">
          From departure to arrival. The context stays together.
        </p>
      </div>
      <div className="landing-arrival-window" data-interface>
        <CustomerPreview mode="arrival" />
      </div>
    </section>
  );
}
