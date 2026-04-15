import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

/**
 * WCAG: Move focus to main content on route change.
 * This ensures screen readers announce the new page content.
 */
export function useRouteA11y() {
  const [location] = useLocation();
  const prevLocation = useRef(location);

  useEffect(() => {
    if (prevLocation.current !== location) {
      prevLocation.current = location;
      // Move focus to main content after route change
      const main = document.getElementById("main-content");
      if (main) {
        main.focus({ preventScroll: false });
      }
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location]);
}
