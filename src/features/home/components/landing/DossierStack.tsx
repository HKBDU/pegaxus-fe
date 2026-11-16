import type { CSSProperties } from "react";

/** Supporting documents underneath the dossier, back to front. */
const PAGES = [
  { code: "CUSTOMS CLEARANCE PROOF", title: "Border crossing" },
  { code: "QUARANTINE PROOF", title: "Arrival country" },
  { code: "EXPORT PERMIT", title: "Country of origin" },
  { code: "HEALTH CERTIFICATE", title: "Fit to travel" },
  { code: "EQUINE PASSPORT", title: "Identity" },
];

const REQUIREMENTS = [
  { name: "Equine passport", status: "Provided" },
  { name: "Health certificate", status: "Approved" },
  { name: "Export permit", status: "Approved" },
  { name: "Quarantine proof", status: "Waived" },
  { name: "Customs clearance proof", status: "Provided" },
];

const IMPRINTS = ["Document approved", "Submitted", "Authority approved"];
const STATUS = [
  "Documents approved",
  "Submitted to authority",
  "Authority approved",
];

/**
 * Decorative 3D compliance dossier: pages settle, requirements are ticked off,
 * a revision is resubmitted and a rubber stamp approves the whole dossier.
 * The static markup is the final, settled state; motion only animates into it.
 */
export function DossierStack() {
  return (
    <div className="landing-dossier" aria-hidden="true">
      <div className="landing-dossier-stack" data-dossier-stack>
        {PAGES.map((page, index) => (
          <div
            className="landing-dossier-slot"
            key={page.code}
            style={{ "--i": index } as CSSProperties}
          >
            <div className="landing-dossier-page" data-dossier-page>
              <span>{page.code}</span>
              <b>{page.title}</b>
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
        <div
          className="landing-dossier-slot"
          style={{ "--i": PAGES.length } as CSSProperties}
        >
          <div
            className="landing-dossier-page is-cover"
            data-dossier-page
            data-dossier-cover
          >
            <svg className="landing-dossier-clip" viewBox="0 0 24 64">
              <path d="M8 58V14a5 5 0 0 1 10 0v40a8 8 0 0 1-16 0V10a10 10 0 0 1 20 0v38" />
            </svg>
            <header>
              <span>COMPLIANCE DOSSIER</span>
              <em className="landing-dossier-status">
                {STATUS.map((label) => (
                  <small key={label} data-dossier-status>
                    {label}
                  </small>
                ))}
              </em>
            </header>
            <b>Trip &amp; horse requirements</b>
            <div className="landing-dossier-progress">
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="19" />
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  pathLength="1"
                  data-dossier-progress
                />
              </svg>
              <strong>
                <span data-dossier-count>5</span>/5
              </strong>
              <small>requirements</small>
            </div>
            <ul>
              {REQUIREMENTS.map((item) => (
                <li key={item.name} data-dossier-row>
                  <svg viewBox="0 0 16 16">
                    <rect x="1" y="1" width="14" height="14" rx="3" />
                    <path
                      d="M4 8.4l2.6 2.6L12 5.4"
                      pathLength="1"
                      data-dossier-tick
                    />
                  </svg>
                  <span>{item.name}</span>
                  <small data-dossier-label>{item.status}</small>
                </li>
              ))}
            </ul>
            {IMPRINTS.map((label, index) => (
              <div
                className="landing-dossier-imprint"
                key={label}
                style={{ "--n": index } as CSSProperties}
                data-dossier-imprint
              >
                <span>{label}</span>
                {Array.from({ length: 5 }, (_, dot) => (
                  <i key={dot} data-dossier-ink />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="landing-dossier-revision">
        <div className="landing-dossier-card" data-dossier-v1>
          <span>HEALTH CERTIFICATE · v1</span>
          <b>Submitted</b>
          <p className="landing-dossier-note" data-dossier-note>
            Revision requested
            <small>Vet signature missing</small>
          </p>
        </div>
        <div className="landing-dossier-card is-current" data-dossier-v2>
          <span>HEALTH CERTIFICATE · v2</span>
          <b>Resubmitted</b>
          <small>Kept on record with v1</small>
        </div>
      </div>
    </div>
  );
}
