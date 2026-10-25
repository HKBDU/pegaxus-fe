import { CustomerPreview } from "./CustomerPreview";

export function PlatformSection() {
  return (
    <section
      id="platform"
      className="landing-chapter landing-platform"
      aria-labelledby="platform-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">04 / The connected platform</p>
        <h2 id="platform-title">
          Every journey.
          <br />
          <em>One clear view.</em>
        </h2>
        <p className="landing-lead">
          From your booking to the current route segment. See the context behind
          the status, without losing sight of the destination.
        </p>
      </div>
      <div className="landing-platform-window" data-interface>
        <CustomerPreview mode="journey" />
      </div>
      <div className="landing-platform-index">
        <span>01 / Booking context</span>
        <span>02 / Route segments</span>
        <span>03 / Journey status</span>
      </div>
    </section>
  );
}
