/* GeoSENSE Lab: Research page, list of publications without a mapped study area
   (reviews, methods, and tools: entries in js/publications.js with points: []).
   Fills <ul id="pub-noplace"> in pages/research.html. Load after js/publications.js. */
(function () {
  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function build() {
    var ul = document.getElementById("pub-noplace");
    if (!ul || !window.PUBS || ul.dataset.ready) return false;
    ul.dataset.ready = "yes";
    var themes = {};
    (window.THEMES || []).forEach(function (t) { themes[t.id] = t; });
    window.PUBS
      .filter(function (p) { return !p.points || !p.points.length; })
      .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); })
      .forEach(function (p) {
        var t = themes[p.theme] || { name: "", color: "#5A6878" };
        var meta = [p.journal, p.year].filter(Boolean).join(", ");
        var title = p.link
          ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>"
          : esc(p.title);
        var li = document.createElement("li");
        li.style.setProperty("--c", t.color);
        li.innerHTML =
          '<span class="rp-dot" aria-hidden="true"></span><span>' +
          '<span class="rp-title">' + title + "</span>" +
          '<span class="rp-meta">' + esc(t.name) + (meta ? " · " + esc(meta) : "") + "</span></span>";
        ul.appendChild(li);
      });
    return true;
  }
  if (!build())
    addEventListener("page:loaded", function (e) {
      if (e.detail && e.detail.id === "page-research") build();
    });
})();
