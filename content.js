
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

    let initialHotkeys = window.SM.DEFAULT_HOTKEYS;
    let hotkeyLoadError = '';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'hydrogen.getHotkeys'
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Could not load shortcuts.');
      }

      initialHotkeys = response.hotkeys;
    } catch (error) {
      hotkeyLoadError = error.message;
      console.error('[SM] Could not load shortcuts:', error);
    }

    const menu = window.SM.createMenu(
      cardInfo,
      initialHotkeys,
      hotkeyLoadError
    );
    let pendingAction = null;
    let pendingTimer = null;

    function isTyping(target) {
      return !!(
        target &&
        target.matches &&
        target.matches('input, textarea, select, [contenteditable="true"]')
      );
    }

    function resetPendingShortcut() {
      pendingAction = null;
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }

    function triggerShortcut(event, action) {
      resetPendingShortcut();
      event.preventDefault();
      event.stopPropagation();

      if (action === 'toggleMenu') {
        menu.toggle();
      } else {
        menu.takeScreenshot();
      }
    }

    document.addEventListener('keydown', (event) => {
      if (event.repeat) return;

      if (menu.isRecordingHotkey) return;

      if (event.key === 'Escape' && menu.visible) {
        resetPendingShortcut();
        event.preventDefault();
        menu.hide();
        return;
      }

      if (isTyping(event.target)) {
        resetPendingShortcut();
        return;
      }

      const bindings = menu.hotkeys;

      if (pendingAction) {
        const pendingBinding = bindings[pendingAction];

        if (event.code === pendingBinding[1]) {
          triggerShortcut(event, pendingAction);
          return;
        }

        resetPendingShortcut();
      }

      for (const action of ['screenshot', 'toggleMenu']) {
        const binding = bindings[action];
        if (binding[0] !== event.code) continue;

        if (binding.length === 1) {
          triggerShortcut(event, action);
          return;
        }

        pendingAction = action;
        pendingTimer = setTimeout(
          resetPendingShortcut,
          window.SM.HOTKEY_SEQUENCE_TIMEOUT
        );
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }, true);
  }).catch(error => {
    console.error('[SM] Menu initialization failed:', error);
  });
})();
