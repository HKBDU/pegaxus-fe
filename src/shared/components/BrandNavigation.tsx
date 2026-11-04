import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-dark.png";
import { ROLE_ROUTES } from "@/app/route-config";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import "./brand-navigation.css";

export function BrandLogo({
  src = logo,
  alt = "PEGAXUS home",
  className,
  imageClassName,
  onClick,
  children,
}: {
  src?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <Link
      to={ROLE_ROUTES.home}
      aria-label={alt}
      className={cn("brand-logo", className)}
      onClick={(event) => {
        onClick?.();
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          window.scrollTo({ top: 0, behavior: "instant" });
        }
      }}
    >
      {children ?? (
        <img
          src={src}
          alt="PEGAXUS"
          className={cn("block h-auto w-[170px] max-w-full", imageClassName)}
        />
      )}
    </Link>
  );
}

export function BrandMobileMenu({
  title,
  children,
  onSectionNavigate,
}: {
  title: string;
  children: (close: () => void) => ReactNode;
  onSectionNavigate?: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const sectionNavigation = useRef<string | null>(null);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1201px)");
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
          className="brand-menu-trigger"
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        className="brand-mobile-menu"
        side="right"
        showCloseButton={false}
        onClickCapture={(event) => {
          const anchor = (event.target as Element).closest<HTMLAnchorElement>(
            'a[href^="#"]',
          );
          if (
            anchor &&
            onSectionNavigate &&
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            sectionNavigation.current = anchor.getAttribute("href");
          }
        }}
        onCloseAutoFocus={(event) => {
          const href = sectionNavigation.current;
          sectionNavigation.current = null;
          if (href && onSectionNavigate) {
            event.preventDefault();
            // Wait for the Sheet's scroll lock to release before navigation.
            requestAnimationFrame(() => onSectionNavigate(href));
          }
        }}
      >
        <div className="brand-mobile-top">
          <BrandLogo onClick={close} />
          <SheetClose asChild>
            <button
              className="brand-menu-trigger"
              aria-label="Close navigation"
            >
              <X aria-hidden="true" />
            </button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="brand-mobile-description">
          Beyond borders. Built around the horse.
        </SheetDescription>
        {children(close)}
      </SheetContent>
    </Sheet>
  );
}
