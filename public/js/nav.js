(function(){
  // Nav height is driven by CSS (see nav-v2.css: 76px desktop, 56px ≤640px).
  // We read nav.offsetHeight at runtime so body padding auto-matches whatever
  // the active media query resolves to — no duplicated constant to drift.
  var NAV_HEIGHT_FALLBACK = 76;

  var NAV_LINKS = [
    { href: '/dashboard.html', label: 'Dashboard' },
    { href: '/nethara-live.html', label: 'Nethara' },
    { href: '/duels.html', label: 'Duels' },
    { href: '/leaderboards.html', label: 'Ranks' },
    { href: '/packs.html', label: 'Packs' },
    { href: '/token.html', label: '$9LV' },
    { href: '/spellbook.html', label: 'Spellbook' },
    { href: '/how-to-play.html', label: 'Help' }
  ];

  var currentPath = window.location.pathname.split('?')[0].split('#')[0];
  if (currentPath === '/' || currentPath === '') currentPath = '/index.html';

  // Don't inject nav or add padding on the splash page
  var isSplash = (currentPath === '/index.html' || currentPath === '/');
  if (isSplash) return;

  function isActive(href) { return currentPath === href; }

  var desktopLinks = '';
  NAV_LINKS.forEach(function(link) {
    desktopLinks += '<li><a href="' + link.href + '"' + (isActive(link.href) ? ' class="active"' : '') + '>' + link.label + '</a></li>';
  });
  desktopLinks += '<li id="navLogout" style="display:none;"><a href="#" class="logout-btn" onclick="doLogout()">Logout</a></li>';

  var mobileLinks = '';
  NAV_LINKS.forEach(function(link) {
    mobileLinks += '<a href="' + link.href + '"' + (isActive(link.href) ? ' class="active"' : '') + '>' + link.label + '</a>';
  });
  mobileLinks += '<a href="#" class="logout-btn" onclick="doLogout()" id="mobileLogout" style="display:none;">Logout</a>';

  // Logo height is class-driven via .nav-logo img (see nav-v2.css) so the
  // mobile media query can shrink it. width:auto + mix-blend + glow stay inline.
  var logoHTML = '<a href="/" class="nav-logo">'
    + '<img '
    + 'src="/assets/images/title-nethara.png" '
    + 'alt="Nines of Nethara" '
    + 'style="height:70px;width:auto;mix-blend-mode:screen;filter:drop-shadow(0 0 8px rgba(212,166,75,0.45));vertical-align:middle;display:block;"'
    + ' onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\'"'
    + '>'
    + '<span style="display:none;font-family:Cinzel,serif;font-weight:700;color:#D4A64B;font-size:15px;letter-spacing:2px;">Nines of Nethara</span>'
    + '</a>';

  var navHTML = '<nav class="top-nav" id="topNav"><div class="top-nav-content">'
    + logoHTML
    + '<ul class="nav-links">' + desktopLinks + '</ul>'
    + '<button class="hamburger" id="hamburger" onclick="window.__toggleMobileMenu()"><span></span><span></span><span></span></button>'
    + '</div></nav>'
    + '<div class="mobile-menu" id="mobileMenu">' + mobileLinks + '</div>';

  var body = document.body;
  var firstChild = body.firstChild;
  var wrapper = document.createElement('div');
  wrapper.innerHTML = navHTML;
  while (wrapper.firstChild) { body.insertBefore(wrapper.firstChild, firstChild); }

  // Apply padding to every page that has a nav. Measure the live nav height so
  // mobile (56px) and desktop (76px) stay in sync automatically — also covers
  // any future height tweak in nav-v2.css without touching this file.
  function syncBodyPad() {
    var nav = document.getElementById('topNav');
    var h = (nav && nav.offsetHeight) || NAV_HEIGHT_FALLBACK;
    body.style.paddingTop = h + 'px';
  }
  syncBodyPad();
  window.addEventListener('resize', syncBodyPad);

  window.__toggleMobileMenu = function() {
    var h = document.getElementById('hamburger');
    var m = document.getElementById('mobileMenu');
    if (h) h.classList.toggle('active');
    if (m) m.classList.toggle('active');
  };

  function checkAuth() {
    var pid = localStorage.getItem('player_id');
    var navLogout = document.getElementById('navLogout');
    var mobileLogout = document.getElementById('mobileLogout');
    if (pid) {
      if (navLogout) navLogout.style.display = '';
      if (mobileLogout) mobileLogout.style.display = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }

  if (typeof window.doLogout === 'undefined') {
    window.doLogout = function() {
      localStorage.removeItem('player_id');
      window.location.href = '/';
    };
  }
})();