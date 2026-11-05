/* Light/dark switch. Loaded in <head> so the saved theme applies before the page paints. */
(function () {
  var theme = null;
  try { theme = localStorage.getItem("phinex_theme"); } catch (e) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#theme-toggle")) return;
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("phinex_theme", next); } catch (e) {}
  });
})();
