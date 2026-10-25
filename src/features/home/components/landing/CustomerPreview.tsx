import { ArrowRight, Check, FileText, MapPin } from "lucide-react";

export function CustomerPreview({
  mode,
}: {
  mode: "dossier" | "journey" | "arrival";
}) {
  const dossier = mode === "dossier";
  const arrival = mode === "arrival";
  return (
    <div
      className={"landing-product-preview landing-preview-" + mode}
      aria-label="Illustrative static Customer interface, not a live account"
    >
      <div className="landing-preview-chrome">
        <b>PEGAXUS</b>
        <span>Customer workspace</span>
        <span aria-hidden="true">•••</span>
      </div>
      <div className="landing-preview-body">
        <p className="landing-preview-label">
          ILLUSTRATIVE PREVIEW · NOT LIVE DATA
        </p>
        <div className="landing-preview-heading">
          <div>
            <small>
              {dossier ? "COMPLIANCE DOSSIER" : "TRANSPORT OVERVIEW"}
            </small>
            <h3>
              {dossier
                ? "Journey documents"
                : arrival
                  ? "A journey, completed."
                  : "The journey at a glance."}
            </h3>
          </div>
          <span
            className={
              "landing-preview-status" + (arrival ? " is-completed" : "")
            }
          >
            {dossier ? "In preparation" : arrival ? "Completed" : "In transit"}
          </span>
        </div>
        {dossier ? (
          <>
            <dl className="landing-preview-meta">
              <div>
                <dt>Dossier type</dt>
                <dd>Main</dd>
              </div>
              <div>
                <dt>Booking</dt>
                <dd>Example booking</dd>
              </div>
            </dl>
            <div className="landing-preview-checklist">
              <div>
                <FileText aria-hidden="true" />
                <span>
                  Trip requirement<small>Supporting document</small>
                </span>
                <b>Provided</b>
              </div>
              <div>
                <FileText aria-hidden="true" />
                <span>
                  Horse requirement<small>Revision requested</small>
                </span>
                <b className="is-requested">Requested</b>
              </div>
            </div>
            <p className="landing-preview-note">
              Documents stay connected to their requirements.
            </p>
          </>
        ) : (
          <>
            <dl className="landing-preview-meta">
              <div>
                <dt>Transport code</dt>
                <dd>Illustrative transport</dd>
              </div>
              <div>
                <dt>Booking code</dt>
                <dd>Example booking</dd>
              </div>
            </dl>
            <div className="landing-preview-route">
              <MapPin aria-hidden="true" />
              <div>
                <small>{arrival ? "JOURNEY" : "CURRENT SEGMENT"}</small>
                <strong>
                  Origin stable <ArrowRight aria-hidden="true" /> Destination
                  stable
                </strong>
              </div>
            </div>
            <ol className="landing-preview-timeline">
              <li>
                <Check aria-hidden="true" />
                <span>
                  Departure
                  <small>
                    {arrival
                      ? "Actual departure recorded"
                      : "Transport in transit"}
                  </small>
                </span>
              </li>
              <li className={arrival ? "" : "is-pending"}>
                {arrival ? (
                  <Check aria-hidden="true" />
                ) : (
                  <span className="landing-timeline-dot" />
                )}
                <span>
                  Arrival
                  <small>
                    {arrival
                      ? "Actual arrival recorded"
                      : "Awaiting actual arrival"}
                  </small>
                </span>
              </li>
              {arrival && (
                <li>
                  <Check aria-hidden="true" />
                  <span>
                    Transport completed<small>Completion recorded</small>
                  </span>
                </li>
              )}
            </ol>
            {!arrival && (
              <span className="landing-preview-affordance">
                Route tracking <ArrowRight aria-hidden="true" />
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
