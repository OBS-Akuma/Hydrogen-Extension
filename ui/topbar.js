// Top bar: title (left), search slot + close button (right).
// The search box is inserted by menu.js before the close button.
(function () {
  const el = window.SM.el;

  const ICON_PATHS = {
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  };

  function svgIcon(name) {
    return '<svg class="sm-svg" viewBox="0 0 24 24" aria-hidden="true">' +
      (ICON_PATHS[name] || '') +
      '</svg>';
  }

  // Inject spin styles once.
  if (!document.getElementById('sm-spin-style')) {
    const style = document.createElement('style');
    style.id = 'sm-spin-style';
    style.textContent = `
      .sm-logo {
        transition: transform 0.6s ease;
        transform-origin: center center;
      }
      .sm-logo:hover {
        transform: rotate(360deg);
      }
    `;
    document.head.appendChild(style);
  }

  window.SM.buildTopbar = function ({ onClose, onFullscreen }) {
    const bar = el('div', 'sm-topbar');

    const left = el('div', 'sm-topbar-left');

    // Title with extension icon
    const title = el('div', 'sm-title');

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('icon/HYD.png');
    logo.alt = 'Hydrogen';
    logo.className = 'sm-logo';
    logo.style.width = '36px';
    logo.style.height = '36px';
    logo.style.objectFit = 'contain';
    logo.style.marginRight = '8px';
    logo.style.verticalAlign = 'middle';
    logo.draggable = false;

    title.appendChild(logo);
    title.appendChild(document.createTextNode('Hydrogen Extension'));
    title.appendChild(el('span', 'sm-title-version', { hidden: true }));

    left.appendChild(title);
    bar.appendChild(left);

    const right = el('div', 'sm-topbar-right');
    right.dataset.searchSlot = '1';

    const closeActions = el('div', 'sm-close-actions');
    const fullscreen = el('button', 'sm-icon-btn sm-fullscreen', {
      type: 'button',
      title: 'Enter fullscreen on this website',
      innerHTML: '<svg class="sm-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/></svg>'
    });
    fullscreen.setAttribute('aria-label', 'Enter fullscreen on this website');
    fullscreen.addEventListener('click', onFullscreen);

    const close = el('button', 'sm-icon-btn sm-close', {
      type: 'button',
      innerHTML: svgIcon('x'),
      title: 'Close'
    });

    close.addEventListener('click', onClose);
    close.setAttribute('aria-label', 'Close Hydrogen menu');
    closeActions.append(fullscreen, close);
    right.appendChild(closeActions);

    bar.appendChild(right);

    return bar;
  };
})();