(function () {
  try {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/marketing/flyer-print.css';
    document.head.appendChild(link);

    if (new URLSearchParams(window.location.search).has('embed')) {
      document.documentElement.classList.add('embed');
    }
  } catch (_) {}
})();
