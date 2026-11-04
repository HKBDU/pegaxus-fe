import { BrandMobileMenu } from "@/shared/components/BrandNavigation";
import {
  LANDING_NAV_ITEMS,
  type LandingChapter,
} from "../../lib/landing-navigation";
import { GuestLinks, TransportLink } from "./LandingActions";
import { scrollToLandingSection } from "../../lib/landing-navigation";

export function LandingMobileMenu({ active }: { active: LandingChapter }) {
  return (
    <BrandMobileMenu
      title="Landing navigation"
      onSectionNavigate={(href) => {
        const section = document.getElementById(href.slice(1));
        if (!section) return;
        // An atomic scroll survives later layout refreshes after the Sheet closes.
        scrollToLandingSection(section, "instant");
      }}
    >
      {(close) => (
        <>
          <nav
            className="brand-mobile-links"
            aria-label="Mobile landing navigation"
          >
            {LANDING_NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="brand-nav-link"
                aria-current={active === item.id ? "location" : undefined}
                onClick={close}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="brand-mobile-actions">
            <TransportLink navbar className="brand-action" onClick={close} />
            <GuestLinks className="brand-nav-link" onClick={close} />
          </div>
        </>
      )}
    </BrandMobileMenu>
  );
}
