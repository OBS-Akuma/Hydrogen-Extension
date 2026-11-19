
(() => {
  if (window.__styleMenuLoaded) return;
  window.__styleMenuLoaded = true;

  window.SM.storage.ready.then(() => {
    const menu = window.SM.createMenu();

    function isTyping(target) {
      return !!(
        target &&
        target.matches &&
        target.matches('input, textarea, select, [contenteditable="true"]')
      );
    }

    document.addEventListener('keydown', (event) => {
      if (event.repeat) return;

      if (event.code === 'ShiftRight') {
        if (isTyping(event.target)) return;

        event.preventDefault();
        menu.toggle();
        return;
      }

      if (event.key === 'Escape' && menu.visible) {
        event.preventDefault();
        menu.hide();
      }
    }, true);
  });
})();
