import { lazy, Suspense } from "react";
import { ChapterNumber } from "./ChapterNumber";
import { DossierStack } from "./DossierStack";

// three.js stays in the lazily loaded renderer chunk.
const StampModel = lazy(() => import("./StampModel"));

export function ComplianceSection() {
  return (
    <section
      id="compliance"
      className="landing-chapter landing-compliance"
      aria-labelledby="compliance-title"
    >
      <div className="landing-compliance-stage">
        <ChapterNumber value="03" side="left" />
        <div className="landing-copy" data-reveal>
          <p className="landing-eyebrow">03 / Precision across borders</p>
          <h2 id="compliance-title" data-split>
            Every detail.
            <br />
            <em>Considered.</em>
          </h2>
          <p className="landing-lead">
            The right documents, in the context of the right journey. Keep trip
            and horse requirements, submissions and requested revisions
            together.
          </p>
          <p className="landing-caption">
            Preparation, not promises. Requirements depend on the journey.
          </p>
        </div>
        <div className="landing-document-composition" data-interface data-depth>
          <DossierStack />
          <div
            className="landing-stamp-tool"
            data-stamp-tool
            aria-hidden="true"
          >
            <Suspense fallback={null}>
              <StampModel />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
