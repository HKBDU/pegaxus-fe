import { ChapterNumber } from "./ChapterNumber";
const MILESTONES = [
  "Departure handover",
  "Border crossed",
  "Quarantine cleared",
  "Delivery handover",
  "Completed",
];

const FILES = [
  "Delivery handover receipt.pdf",
  "Departure handover receipt.pdf",
  "Route log.csv",
  "Customs clearance proof.pdf",
];

const SIGNATURE =
  "M6 46c10-30 22-38 26-20s-6 30 4 18 12-36 20-30-2 32 8 26 10-22 18-18-4 18 6 16 14-14 22-12 6 10 14 6 16-8 30-10";

/**
 * Finish line: the journey track completes, the delivery handover receipt is
 * signed and the records gather into an audit pack. Static markup is the end state.
 */
function FinishLine() {
  return (
    <div className="landing-finish" data-finish aria-hidden="true">
      <div className="landing-finish-track">
        <span className="landing-finish-rail">
          <i data-finish-fill />
        </span>
        <ol>
          {MILESTONES.map((label) => (
            <li key={label} data-finish-milestone>
              <i />
              {label}
            </li>
          ))}
        </ol>
      </div>
      <div className="landing-finish-docs">
        <article className="landing-finish-receipt" data-finish-receipt>
          <header>
            <span>Delivery handover receipt</span>
            <small>Illustrative</small>
          </header>
          <dl>
            <div>
              <dt>Horse</dt>
              <dd>Example horse</dd>
            </div>
            <div>
              <dt>Received at</dt>
              <dd>Destination stable</dd>
            </div>
            <div>
              <dt>Condition on arrival</dt>
              <dd>Settled, eating well</dd>
            </div>
          </dl>
          <svg className="landing-finish-signature" viewBox="0 0 260 64">
            <path d={SIGNATURE} pathLength="1" data-finish-signature />
          </svg>
          <p className="landing-finish-sign">Signed on delivery</p>
          <b className="landing-finish-complete" data-finish-complete>
            Completed
          </b>
        </article>
        <article className="landing-finish-pack" data-finish-pack>
          <header>
            <svg viewBox="0 0 40 48" data-finish-zip>
              <path d="M4 2h22l10 10v34H4z" />
              <path d="M26 2v10h10" />
              <path d="M16 6h4M16 12h4M16 18h4M16 24h4" />
              <rect x="14" y="28" width="8" height="9" rx="1.5" />
            </svg>
            <span>
              <b>Audit pack.zip</b>
              <small>{FILES.length} files · kept on record</small>
            </span>
          </header>
          <ul>
            {FILES.map((file) => (
              <li key={file} data-finish-file>
                {file}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

export function ReliabilitySection() {
  return (
    <section
      id="reliability"
      className="landing-chapter landing-reliability"
      aria-labelledby="reliability-title"
    >
      <ChapterNumber value="07" />
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">07 / The proof of care</p>
        <h2 id="reliability-title" data-split>
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
      <FinishLine />
    </section>
  );
}
