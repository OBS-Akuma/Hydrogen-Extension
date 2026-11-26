
(() => {
  if (window.__styleMenuLoaded) return;
  window.__styleMenuLoaded = true;

  async function loadCardInfo() {
    const response = await fetch(
      chrome.runtime.getURL('json/CardInfo.json')
    );

    if (!response.ok) {
      throw new Error('Could not load card info: HTTP ' + response.status);
    }

    const cardInfo = await response.json();

    if (
      !cardInfo ||
      typeof cardInfo !== 'object' ||
      Array.isArray(cardInfo) ||
      Object.values(cardInfo).some(value => typeof value !== 'string')
    ) {
      throw new Error('Card info must be an object of string values');
    }

    return cardInfo;
  }

  window.SM.storage.ready.then(async () => {
    let cardInfo = {};

    try {
      cardInfo = await loadCardInfo();
    } catch (error) {
      console.error('[SM] Card info load failed:', error);
    }

    const menu = window.SM.createMenu(cardInfo);

    function isTyping(target) {
      return !!(
        target &&
        target.matches &&
        target.matches(
          'input, textarea, select, [contenteditable="true"], ' +
          '.sm-hotkey-capture.sm-recording'
        )
      );
    }

    document.addEventListener('keydown', (event) => {
      if (event.repeat) return;

      if (isTyping(event.target)) return;

      const hotkey = window.SM.storage.loadHotkey();
      if (event.code === hotkey.code) {
        event.preventDefault();
        menu.toggle();
      }

      if (event.key === 'Escape' && menu.visible) {
        event.preventDefault();
        menu.hide();
      }
    }, true);
  }).catch(error => {
    console.error('[SM] Menu initialization failed:', error);
  });
})();
