(function () {
  try {
    var style = document.createElement('style');
    style.textContent = [
      '.shot img,',
      '.img img,',
      '.img-frame img,',
      '.img-wrap img,',
      '.img-box img,',
      '.frame img,',
      '.screenshot-wrap img {',
      '  height: auto !important;',
      '  max-width: 100%;',
      '  object-fit: contain;',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    if (new URLSearchParams(window.location.search).has('embed')) {
      document.documentElement.classList.add('embed');
    }
  } catch (_) {}
})();
