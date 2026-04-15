/**
 * WCAG: Utility to announce messages to screen readers via aria-live region.
 * Compatible with JAWS and NVDA.
 * Usage: announce("5 resultados encontrados");
 * Usage: announce("Erro no formulário", "assertive");
 */

function ensureLiveRegion(): HTMLElement {
  let el = document.getElementById("a11y-announcer");
  if (el) return el;

  // Create the live region if it doesn't exist yet
  el = document.createElement("div");
  el.id = "a11y-announcer";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  // Visually hidden but accessible to screen readers
  Object.assign(el.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });
  document.body.appendChild(el);
  return el;
}

export function announce(message: string, priority: "polite" | "assertive" = "polite") {
  const el = ensureLiveRegion();
  el.setAttribute("aria-live", priority);
  // Clear first to ensure re-announcement of same message
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function useA11yAnnounce() {
  return { announce };
}
