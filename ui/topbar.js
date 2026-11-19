
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

  window.SM.buildTopbar = function ({ onClose }) {
    const bar = el('div', 'sm-topbar');

    const left = el('div', 'sm-topbar-left');

    // Title with extension icon
    const title = el('div', 'sm-title');

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('icon/HYD.png');
    logo.alt = 'Hydrogen';
    logo.style.width = '24px';
    logo.style.height = '24px';
    logo.style.objectFit = 'contain';
    logo.style.marginRight = '8px';
    logo.style.verticalAlign = 'middle';
    logo.draggable = false;

    title.appendChild(logo);
    title.appendChild(document.createTextNode('Hydrogen Extension'));

    left.appendChild(title);
    bar.appendChild(left);

    const right = el('div', 'sm-topbar-right');
    right.dataset.searchSlot = '1';

    const close = el('button', 'sm-icon-btn sm-close', {
      type: 'button',
      innerHTML: svgIcon('x'),
      title: 'Close'
    });

    close.addEventListener('click', onClose);
    right.appendChild(close);

    bar.appendChild(right);

    return bar;
  };
})();
