import { useEffect, useRef, useState, type RefObject } from "react";

interface ViewportEntryOptions {
  enabled?: boolean;
  root?: Element | Document | null;
  rootMargin?: string;
}

interface Observation {
  target: Element;
  root: Element | Document | null;
  rootMargin: string;
  stop: () => void;
}

/** Latches the first intersection; leaving the viewport never suspends an entered view. */
export function useViewportEntry<T extends Element>(
  targetRef: RefObject<T | null>,
  {
    enabled = true,
    root = null,
    rootMargin = "300px 0px",
  }: ViewportEntryOptions = {},
) {
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const observation = useRef<Observation | null>(null);

  // Check the committed target each render: object refs can point at a replacement
  // node without changing identity. Reuse the observer when its inputs are unchanged.
  useEffect(() => {
    const target = targetRef.current;
    const previous = observation.current;
    if (!enabled || hasEnteredViewport || !target) {
      previous?.stop();
      observation.current = null;
      return;
    }
    if (
      previous?.target === target &&
      previous.root === root &&
      previous.rootMargin === rootMargin
    )
      return;
    previous?.stop();

    let active = true;
    let observer: IntersectionObserver | undefined;
    const current: Observation = {
      target,
      root,
      rootMargin,
      stop: () => {
        if (!active) return;
        active = false;
        observer?.disconnect();
      },
    };
    observation.current = current;
    const enter = () => {
      if (!active || observation.current !== current) return;
      current.stop();
      setHasEnteredViewport(true);
    };

    try {
      if (typeof IntersectionObserver !== "function") {
        enter();
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) => entry.target === target && entry.isIntersecting,
            )
          )
            enter();
        },
        { root, rootMargin, threshold: 0 },
      );
      observer.observe(target);
    } catch {
      // Unsupported or invalid observer options must never leave a view unloaded.
      enter();
    }
  });

  useEffect(
    () => () => {
      observation.current?.stop();
      observation.current = null;
    },
    [],
  );

  return hasEnteredViewport;
}
