import { FileCheck2, Files, ShieldCheck } from "lucide-react";

export function ComplianceSection() {
  return (
    <section
      id="compliance"
      className="landing-chapter landing-compliance"
      aria-labelledby="compliance-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">02 / Details that matter</p>
        <h2 id="compliance-title">
          Every border.
          <br />
          Every document.
          <br />
          <em>Under control.</em>
        </h2>
        <p className="landing-lead">
          Keep legal and health documentation connected to its transport
          booking. Organize submissions, document reviews and requested
          revisions in one dossier.
        </p>
        <div className="landing-document-lines">
          <div>
            <Files aria-hidden="true" />
            <span>Trip & horse requirements</span>
            <span>01</span>
          </div>
          <div>
            <FileCheck2 aria-hidden="true" />
            <span>Document submissions & reviews</span>
            <span>02</span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>A clear record of revisions</span>
            <span>03</span>
          </div>
        </div>
        <p className="landing-caption">
          Preparation, not promises. Requirements depend on the journey.
        </p>
      </div>
      <span className="landing-border-stamp" aria-hidden="true">
        PREPARE
        <br />
        REVIEW
        <br />
        COORDINATE
      </span>
    </section>
  );
}
