(() => {
  const el = window.SM.el;

  window.SM.buildHotkeysTab = function ({ onScreenshot }) {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-hotkeys';

    const card = el('div', 'sm-card');
    const head = el('div', 'sm-card-head');
    head.append(
      el('div', 'sm-card-title', { textContent: 'Screenshot Hotkey' }),
      el('div', 'sm-card-desc', {
        textContent:
          'Press F, then 1 within 1.5 seconds to save a screenshot of the current tab. This is a sequence, not F1.'
      })
    );

    const button = el('button', 'sm-plugin-button', {
      type: 'button',
      textContent: 'Take Screenshot'
    });
    const status = el('div', 'sm-plugin-status', {
      textContent: 'The screenshot will be saved in Downloads/Hydrogen.'
    });
    status.setAttribute('role', 'status');

    button.addEventListener('click', onScreenshot);
    card.append(head, button, status);
    root.appendChild(card);

    return {
      root,
      setStatus(message) {
        status.textContent = message;
      }
    };
  };
})();
