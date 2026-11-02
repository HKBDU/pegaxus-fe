import {
  LANDING_NAV_ITEMS,
  type LandingChapter,
} from "../../lib/landing-navigation";
import { LandingMobileMenu } from "./LandingMobileMenu";
import {
  CustomerAccountTools,
  GuestLinks,
  TransportLink,
} from "./LandingActions";
import { BrandLogo } from "@/shared/components/BrandNavigation";
import { useLandingAuth } from "../../hooks/useLandingAuth";
import { useSmartNavbar } from "@/shared/hooks/useSmartNavbar";
export function LandingNavbar({
  active,
  scrolled,
}: {
  active: LandingChapter;
  scrolled: boolean;
}) {
  const navbarRef = useSmartNavbar();
  const { customer } = useLandingAuth();
  return (
    <header
      ref={navbarRef}
      className={`landing-navbar brand-navbar${scrolled ? " is-scrolled" : ""}`}
    >
      <BrandLogo />
      <nav className="brand-nav-links" aria-label="Landing navigation">
        {LANDING_NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="brand-nav-link"
            aria-current={active === item.id ? "location" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="brand-nav-actions">
        <GuestLinks className="brand-nav-link" />
        <TransportLink navbar className="brand-action" />
        {customer && <CustomerAccountTools />}
      </div>
      {customer && (
        <div className="brand-mobile-account">
          <CustomerAccountTools />
        </div>
      )}
      <LandingMobileMenu active={active} />
    </header>
  );
}
