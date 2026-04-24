(() => {
  const body = document.body;
  if (!body) return;

  const hasNativeViewTransitions =
    typeof document.startViewTransition === "function" &&
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("view-transition-name: page");

  // If the browser supports cross-document View Transitions,
  // let native navigation handle the animation.
  if (hasNativeViewTransitions) return;

  body.classList.add("page-transition");
  requestAnimationFrame(() => body.classList.add("page-ready"));

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const url = new URL(link.href, window.location.href);
    const isSameOrigin = url.origin === window.location.origin;
    if (!isSameOrigin) return;

    event.preventDefault();
    body.classList.remove("page-ready");
    setTimeout(() => {
      window.location.href = link.href;
    }, 180);
  });
})();
