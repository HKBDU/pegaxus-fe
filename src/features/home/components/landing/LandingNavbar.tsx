import { Link } from "react-router-dom";
import {
  LANDING_NAV_ITEMS,
  type LandingChapter,
} from "../../lib/landing-navigation";
import { LandingMobileMenu } from "./LandingMobileMenu";
import { TransportLink } from "./LandingActions";
import logo from "@/assets/logo-dark.png"
export function LandingNavbar({
  active,
  scrolled,
}: {
  active: LandingChapter;
  scrolled: boolean;
}) {
  return (
    <header className={`landing-navbar${scrolled ? " is-scrolled" : ""}`}>
      <a className="landing-brand" href="#home" aria-label="PEGAXUS home">
        <img src={logo} alt="Pegaxus" className="w-full max-w-[170px]" />
      </a>
      <nav className="landing-desktop-nav" aria-label="Landing navigation">
        {LANDING_NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="landing-nav-actions">
        <Link to="/login" className="landing-sign-in">
          Sign in
        </Link>
        <TransportLink />
      </div>
      <LandingMobileMenu active={active} />
    </header>
  );
}
