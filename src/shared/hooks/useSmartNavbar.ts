import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSmartNavbar(enabled = true) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const navbar = ref.current;
    if (!enabled || !navbar) return;
    let lastY = Math.max(0, scrollY);
    let direction = 0;
    let distance = 0;
    const pointer = matchMedia("(hover: hover) and (pointer: fine)");
    let hovered = pointer.matches && navbar.matches(":hover");
    let edgeRevealed = false;
    let inputAt = -Infinity;
    let frame = 0;
    const protectedInteraction = () =>
      hovered ||
      edgeRevealed ||
      (navbar.contains(document.activeElement) &&
        Boolean(
          document.activeElement?.matches(
            ":focus-visible,input,textarea,select",
          ),
        )) ||
      Boolean(
        navbar.querySelector(
          '[aria-expanded="true"],button[data-state="open"]',
        ),
      );
    const show = () => navbar.removeAttribute("data-nav-hidden");
    const hide = () => {
      if (scrollY > 88 && !protectedInteraction())
        navbar.setAttribute("data-nav-hidden", "true");
      else show();
    };
    const update = () => {
      frame = 0;
      const y = Math.max(0, scrollY);
      const delta = y - lastY;
      lastY = y;
      if (y <= 16 || protectedInteraction()) {
        distance = 0;
        show();
        return;
      }
      // Layout refreshes and route restoration alone must not hide navigation.
      if (Math.abs(delta) < 0.5) return;
      const next = Math.sign(delta);
      distance =
        next === direction ? distance + Math.abs(delta) : Math.abs(delta);
      direction = next;
      if (direction < 0 && distance >= 2) show();
      else if (
        direction > 0 &&
        distance >= 14 &&
        performance.now() - inputAt <= 800
      )
        hide();
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const intent = () => {
      inputAt = performance.now();
    };
    const key = (event: KeyboardEvent) => {
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        intent();
    };
    const enter = (event: PointerEvent) => {
      if (pointer.matches && event.pointerType === "mouse") {
        hovered = true;
        show();
      }
    };
    const leave = () => {
      hovered = false;
      edgeRevealed = false;
      if (direction > 0) hide();
    };
    const move = (event: PointerEvent) => {
      if (event.buttons) intent();
      if (!pointer.matches || event.pointerType !== "mouse") return;
      if (event.clientY <= 12) {
        edgeRevealed = true;
        show();
      } else if (edgeRevealed && event.clientY > navbar.offsetHeight + 24) {
        edgeRevealed = false;
        if (direction > 0) hide();
      }
    };
    const observer = new MutationObserver(() => {
      if (protectedInteraction()) show();
    });
    observer.observe(navbar, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "data-state"],
    });
    show();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("wheel", intent, { capture: true, passive: true });
    window.addEventListener("touchmove", intent, {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", intent, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    navbar.addEventListener("pointerenter", enter);
    navbar.addEventListener("pointerleave", leave);
    navbar.addEventListener("focusin", show);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("wheel", intent, true);
      window.removeEventListener("touchmove", intent, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", intent);
      window.removeEventListener("pointermove", move);
      navbar.removeEventListener("pointerenter", enter);
      navbar.removeEventListener("pointerleave", leave);
      navbar.removeEventListener("focusin", show);
      show();
    };
  }, [enabled, pathname]);
  return ref;
}
