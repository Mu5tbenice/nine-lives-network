(function(){
  var NAV_LINKS = [
    { href: '/dashboard.html', label: 'Dashboard' },
    { href: '/nethara-live.html', label: 'Nethara' },
    { href: '/duels.html', label: 'Duels' },
    { href: '/gauntlet.html', label: 'Gauntlet' },
    { href: '/boss.html', label: 'Boss' },
    { href: '/leaderboards.html', label: 'Ranks' },
    { href: '/packs.html', label: 'Packs' },
    { href: '/collection.html', label: 'Spellbook' },
    { href: '/profile.html', label: 'Profile' },
    { href: '/how-to-play.html', label: 'Help' }
  ];
  var currentPath = window.location.pathname.split('?')[0].split('#')[0];
  if (currentPath === '/' || currentPath === '') currentPath = '/index.html';
  function isActive(href) {
    return currentPath === href;
  }
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
  var navHTML = '<nav class="top-nav" id="topNav"><div class="top-nav-content">'
    + '<a href="/" class="nav-logo">Nine Lives Network</a>'
    + '<ul class="nav-links">' + desktopLinks + '</ul>'
    + '<button class="hamburger" id="hamburger" onclick="window.__toggleMobileMenu()"><span></span><span></span><span></span></button>'
    + '</div></nav>'
    + '<div class="mobile-menu" id="mobileMenu">' + mobileLinks + '</div>';
  var body = document.body;
  var firstChild = body.firstChild;
  var wrapper = document.createElement('div');
  wrapper.innerHTML = navHTML;
  while (wrapper.firstChild) {
    body.insertBefore(wrapper.firstChild, firstChild);
  }
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