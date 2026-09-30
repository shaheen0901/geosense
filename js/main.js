/* GeoSENSE Lab: tab navigation and mobile menu */
// Tabs: each menu item shows one page; the address (e.g. #people) can be bookmarked or shared
const pages = [...document.querySelectorAll('.page')];
const links = [...document.querySelectorAll('#menu a')];
const btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
function show() {
  const id = (location.hash || '#home').slice(1);
  const target = pages.find(p => p.id === 'page-' + id) || pages[0];
  pages.forEach(p => p.hidden = p !== target);
  links.forEach(a => 'page-' + a.getAttribute('href').slice(1) === target.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  menu.classList.remove('show'); btn.setAttribute('aria-expanded', false);
  window.scrollTo(0, 0);
  if (target.id === 'page-home') window.dispatchEvent(new Event('geoanim:show'));
  if (target.dataset.src && !target.dataset.loaded) load(target);
}
addEventListener('hashchange', show);
btn.addEventListener('click', () => btn.setAttribute('aria-expanded', menu.classList.toggle('show')));
document.getElementById('yr').textContent = new Date().getFullYear();
show();

// Sections kept in their own HTML file (data-src) are loaded the first time they are opened.
// This needs a web server (Live Server, GitHub Pages, or any host); double-clicking index.html will not load them.
function load(page) {
  page.dataset.loaded = 'yes';
  page.innerHTML = '<div class="page-body"><div class="wrap"><p class="hint">Loading…</p></div></div>';
  fetch(page.dataset.src)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(html => {
      page.innerHTML = html;
      // tell other scripts (e.g. research-map.js) that this section's content now exists
      window.dispatchEvent(new CustomEvent('page:loaded', { detail: { id: page.id } }));
    })
    .catch(() => {
      delete page.dataset.loaded;
      page.innerHTML = '<div class="page-body"><div class="wrap"><p>This section could not be loaded. ' +
        'If you opened index.html directly from your computer, open it with Live Server instead.</p></div></div>';
    });
}
