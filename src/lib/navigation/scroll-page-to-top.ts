/** Scroll all app scroll containers (portal main + root) to the top. */
export function scrollPageToTop() {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });

  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** After client navigation or router.refresh(), once the DOM has updated. */
export function scrollPageToTopAfterUpdate() {
  if (typeof window === "undefined") return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollPageToTop();
    });
  });
}
