import { ArrowRight, Check, MapPin } from "lucide-react";

/** Illustrative Customer journey view shown as the Platform dashboard. */
export function CustomerPreview() {
  return (
    <div
      className="landing-product-preview landing-preview-journey"
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
            <small>TRANSPORT OVERVIEW</small>
            <h3>The journey at a glance.</h3>
          </div>
          <span className="landing-preview-status">In transit</span>
        </div>
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
            <small>CURRENT SEGMENT</small>
            <strong>
              Origin stable <ArrowRight aria-hidden="true" /> Destination stable
            </strong>
          </div>
        </div>
        <ol className="landing-preview-timeline">
          <li>
            <Check aria-hidden="true" />
            <span>
              Departure
              <small>Transport in transit</small>
            </span>
          </li>
          <li className="is-pending">
            <span className="landing-timeline-dot" />
            <span>
              Arrival
              <small>Awaiting actual arrival</small>
            </span>
          </li>
        </ol>
        <span className="landing-preview-affordance">
          Route tracking <ArrowRight aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
