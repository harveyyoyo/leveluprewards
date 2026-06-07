(function () {
  try {
    var isClassic =
      typeof location !== 'undefined' &&
      location.pathname.indexOf('/marketing/classic/') !== -1;

    var isGenerator =
      typeof location !== 'undefined' &&
      /flyer-private-school-(pillar-proposal|funding)\.html$/i.test(location.pathname);

    if (!isClassic && !isGenerator) {
      var bold = document.createElement('link');
      bold.rel = 'stylesheet';
      bold.href = '/marketing/flyer-bold-theme.css';
      document.head.appendChild(bold);
    }

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/marketing/flyer-print.css';
    document.head.appendChild(link);

    if (new URLSearchParams(window.location.search).has('embed')) {
      document.documentElement.classList.add('embed');
    }
  } catch (_) {}
})();
