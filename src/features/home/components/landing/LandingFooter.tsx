import { GuestLinks, TransportLink } from "./LandingActions";
import { BrandLogo } from "@/shared/components/BrandNavigation";
import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-top">
        <div>
          <BrandLogo className="landing-brand">
            PEGAXUS
          </BrandLogo>
          <p>
            Cross-border racehorse transport.
            <br />A clearer journey, from the beginning.
          </p>
        </div>
        <nav aria-label="Footer product navigation">
          <span className="landing-eyebrow">Explore</span>
          <a href="#journey">The journey</a>
          <a href="#compliance">Compliance</a>
          <a href="#platform">The platform</a>
        </nav>
        <div className="landing-footer-account">
          <span className="landing-eyebrow">Your next chapter</span>
          <GuestLinks />
          <TransportLink final />
        </div>
      </div>
      <div className="landing-footer-bottom">
        <Link to="/terms">View policies and terms</Link>
        <span>© {new Date().getFullYear()} PEGAXUS. All rights reserved.</span>
        <a href="#home">Back to the beginning ↑</a>
      </div>
    </footer>
  );
}
