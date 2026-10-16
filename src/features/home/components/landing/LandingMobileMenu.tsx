import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
  LANDING_NAV_ITEMS,
  type LandingChapter,
} from "../../lib/landing-navigation";
import { TransportLink } from "./LandingActions";

export function LandingMobileMenu({ active }: { active: LandingChapter }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1101px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="landing-menu-trigger"
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        className="pegaxus-mobile-menu"
        side="right"
        showCloseButton={false}
      >
        <div className="landing-mobile-top">
          <SheetTitle className="landing-mobile-wordmark">PEGAXUS</SheetTitle>
          <SheetClose asChild>
            <button
              className="landing-menu-trigger"
              aria-label="Close navigation"
            >
              <X aria-hidden="true" />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="landing-mobile-description">
          Beyond borders. Built around the horse.
        </SheetDescription>
        <nav aria-label="Mobile landing navigation">
          {LANDING_NAV_ITEMS.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              onClick={close}
            >
              <span>0{index + 1}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="landing-mobile-actions">
          <TransportLink onClick={close} />
          <Link to="/login" className="landing-text-link" onClick={close}>
            Sign in <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
