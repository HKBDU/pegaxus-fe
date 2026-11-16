import { ChapterNumber } from "./ChapterNumber";
import { useId } from "react";
import { CustomerPreview } from "./CustomerPreview";

const CARDS = ["booking", "route", "status"] as const;

function BookingCard() {
  return (
    <>
      <header>
        <span>01 / Booking</span>
        <em>Example booking</em>
      </header>
      <p className="landing-platform-horses">
        <strong data-platform-count="2" data-from="0">
          2
        </strong>{" "}
        horses
      </p>
      <ol className="landing-platform-legs">
        <li data-platform-pop>
          <small>Pickup</small>
          Origin stable
        </li>
        <li data-platform-pop>
          <small>Delivery</small>
          Destination stable
        </li>
      </ol>
    </>
  );
}

function RouteCard() {
  return (
    <>
      <header>
        <span>02 / Route segments</span>
        <em>3 stops</em>
      </header>
      <svg className="landing-platform-minimap" viewBox="0 0 200 92">
        <path className="is-ghost" d="M18 72 L98 24 L182 60" />
        <path d="M18 72 L98 24 L182 60" pathLength="1" data-platform-route />
        {[
          [18, 72, "A"],
          [98, 24, "B"],
          [182, 60, "C"],
        ].map(([x, y, label]) => (
          <g key={label}>
            <circle cx={x} cy={y} r="4.5" />
            <text x={Number(x) + 8} y={Number(y) + 16}>
              {label}
            </text>
          </g>
        ))}
        <circle
          className="landing-platform-runner"
          cx="140"
          cy="42"
          r="5"
          data-platform-runner
        />
      </svg>
      <ol className="landing-platform-legs is-compact">
        <li data-platform-pop>
          A → B <small>Completed</small>
        </li>
        <li data-platform-pop>
          B → C <small>In transit</small>
        </li>
      </ol>
    </>
  );
}

function StatusCard() {
  return (
    <>
      <header>
        <span>03 / Journey status</span>
        <em className="landing-platform-live">
          <i />
          In transit
        </em>
      </header>
      <p className="landing-platform-eta">
        <small>ETA</small>
        <strong>
          <span data-platform-count="2" data-from="6">
            2
          </span>
          h{" "}
          <span data-platform-count="15" data-from="40">
            15
          </span>
          m
        </strong>
      </p>
      <div className="landing-platform-bar">
        <i data-platform-bar />
      </div>
      <small className="landing-platform-note">
        Departure handover done · next stop Destination stable
      </small>
    </>
  );
}

const CONTENT = { booking: BookingCard, route: RouteCard, status: StatusCard };

export function PlatformSection() {
  const glow = "landing-wire-" + useId().replace(/:/g, "");
  return (
    <section
      id="platform"
      className="landing-chapter landing-platform"
      aria-labelledby="platform-title"
    >
      <div className="landing-platform-stage-wrap">
        <ChapterNumber value="04" />
        <div className="landing-copy" data-reveal>
          <p className="landing-eyebrow">04 / The connected platform</p>
          <h2 id="platform-title" data-split>
            Every journey.
            <br />
            <em>One clear view.</em>
          </h2>
          <p className="landing-lead">
            From your booking to the current route segment. See the context
            behind the status, without losing sight of the destination.
          </p>
        </div>
        <div className="landing-platform-window" data-interface data-depth>
          <div className="landing-platform-tilt" data-platform-tilt>
            <div className="landing-platform-stage" data-platform-stage>
              <svg
                className="landing-platform-wires"
                data-platform-wires
                aria-hidden="true"
              >
                <defs>
                  <filter
                    id={glow}
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>
                {CARDS.map((card) => (
                  <g key={card} data-platform-wire={card}>
                    <path className="is-glow" filter={`url(#${glow})`} />
                    <path className="is-line" />
                    <path className="is-packets" />
                  </g>
                ))}
              </svg>
              <div className="landing-platform-front" data-platform-front>
                <CustomerPreview />
              </div>
              {CARDS.map((card) => {
                const Content = CONTENT[card];
                return (
                  <article
                    key={card}
                    className={`landing-platform-card is-${card}`}
                    data-platform-card={card}
                    aria-hidden="true"
                  >
                    <Content />
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
