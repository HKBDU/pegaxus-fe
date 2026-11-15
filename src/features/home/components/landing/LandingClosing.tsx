import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/shared/components/BrandNavigation";
import footerPhoto from "@/assets/footer.jpg";
import logoBlack from "@/assets/Logo-black.png";
import { GuestLinks, TransportLink } from "./LandingActions";

/**
 * Closing chapter and footer in one: a full-bleed photograph with the final
 * call to action on a centred panel, contact copy and links either side.
 */
export function LandingClosing() {
  return (
    <footer
      id="about"
      className="landing-closing"
      aria-labelledby="final-title"
    >
      <div className="landing-closing-media" aria-hidden="true">
        <img
          src={footerPhoto}
          alt=""
          width={1100}
          height={733}
          loading="lazy"
          decoding="async"
          data-closing-photo
        />
      </div>
      <div className="landing-closing-grid">
        <div className="landing-closing-side" data-closing-side>
          <p className="landing-eyebrow">08 / The next chapter</p>
          <p>
            Cross-border racehorse transport.
            <br />A clearer journey, from the beginning.
          </p>
        </div>
        <div className="landing-closing-panel" data-closing-panel>
          <BrandLogo src={logoBlack} className="landing-closing-brand" />
          <h2 id="final-title" data-split>
            Their next chapter
            <br />
            <em>starts here.</em>
          </h2>
          <p className="landing-lead">
            Cross-border coordination for every journey.
            <br />
            Built around the horse. Connected by the details.
          </p>
          <TransportLink final className="landing-button landing-closing-cta" />
          <div className="landing-closing-account">
            <GuestLinks className="landing-text-link" />
          </div>
          <p className="landing-closing-note">
            <span>Illustrative previews</span>
            <span>Not live tracking</span>
          </p>
        </div>
        <nav
          className="landing-closing-side is-links"
          aria-label="Footer product navigation"
          data-closing-side
        >
          <span className="landing-eyebrow">Explore</span>
          <a href="#journey">The journey</a>
          <a href="#compliance">Compliance</a>
          <a href="#platform">The platform</a>
          <a href="#care">The human touch</a>
        </nav>
      </div>
      <div className="landing-closing-bottom">
        <span>© {new Date().getFullYear()} PEGAXUS. All rights reserved.</span>
        <a
          href="#home"
          className="landing-closing-top"
          aria-label="Back to the beginning"
        >
          <ArrowUp aria-hidden="true" />
        </a>
        <Link to="/terms">View policies and terms</Link>
      </div>
    </footer>
  );
}
