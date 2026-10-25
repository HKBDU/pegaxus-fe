import { CustomerPreview } from "./CustomerPreview";

export function ComplianceSection() {
  return (
    <section
      id="compliance"
      className="landing-chapter landing-compliance"
      aria-labelledby="compliance-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">03 / Precision across borders</p>
        <h2 id="compliance-title">
          Every detail.
          <br />
          <em>Considered.</em>
        </h2>
        <p className="landing-lead">
          The right documents, in the context of the right journey. Keep trip
          and horse requirements, submissions and requested revisions together.
        </p>
        <p className="landing-caption">
          Preparation, not promises. Requirements depend on the journey.
        </p>
      </div>
      <div className="landing-document-composition" data-interface>
        <div className="landing-document-sheet" aria-hidden="true">
          <span>JOURNEY DOSSIER</span>
          <b>
            Prepared with
            <br />
            purpose.
          </b>
          <i />
          <i />
          <i />
        </div>
        <CustomerPreview mode="dossier" />
      </div>
    </section>
  );
}
