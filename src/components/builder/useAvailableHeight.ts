import { useCallback, useEffect, useRef, useState } from 'react';

/** Breathing room below the canvas so it does not butt against the viewport. */
const BOTTOM_GUTTER = 12;

/** Never collapse below this, however little room the host chrome leaves. */
const MIN_HEIGHT = 360;

/**
 * Height that makes an element fill the rest of the viewport.
 *
 * The builder cannot use a fixed `70vh`: the host renders it under an app bar,
 * a breadcrumb bar and the screen's own header, so a viewport fraction either
 * overflows (pushing the canvas half off-screen, with the page scrolling behind
 * it) or leaves a dead band. Measuring the element's own offset from the top of
 * the viewport is the only value that is right on every host.
 *
 * Returns `undefined` while disabled or before the first measurement, so the
 * caller can fall back to its own `height`.
 */
export const useAvailableHeight = (
  enabled: boolean,
): [(node: HTMLElement | null) => void, number | undefined] => {
  const elementRef = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    const { top } = element.getBoundingClientRect();
    setHeight(Math.max(MIN_HEIGHT, window.innerHeight - top - BOTTOM_GUTTER));
  }, []);

  // A callback ref rather than an effect on a plain ref: the element is only
  // attached after the lazy-loaded canvas paints, and the first measurement has
  // to happen then rather than on the parent's mount.
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      elementRef.current = node;
      if (node && enabled) measure();
    },
    [enabled, measure],
  );

  useEffect(() => {
    if (!enabled) return;

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [enabled, measure]);

  return [setRef, enabled ? height : undefined];
};
