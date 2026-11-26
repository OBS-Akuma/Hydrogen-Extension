(function () {
  const el = window.SM.el;

  function formatHotkey(hotkey) {
    const modifiers = [];
    if (hotkey.ctrl) modifiers.push('Ctrl');
    if (hotkey.alt) modifiers.push('Alt');
    if (hotkey.shift) modifiers.push('Shift');
    if (hotkey.meta) modifiers.push('Meta');

    const keyNames = {
      ShiftLeft: 'Left Shift',
      ShiftRight: 'Right Shift',
      ControlLeft: 'Left Ctrl',
      ControlRight: 'Right Ctrl',
      AltLeft: 'Left Alt',
      AltRight: 'Right Alt',
      MetaLeft: 'Left Meta',
      MetaRight: 'Right Meta',
      Space: 'Space'
    };
    const key = keyNames[hotkey.code] ||
      hotkey.code.replace(/^(Key|Digit|Numpad)/, '');

    if (!modifiers.includes(key.split(' ')[0])) modifiers.push(key);
    return modifiers.join(' + ');
  }

  window.SM.buildHotkeysTab = function () {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-hotkeys';

    const card = el('div', 'sm-card');
    const head = el('div', 'sm-card-head');
    head.append(
      el('div', 'sm-card-title', { textContent: 'Menu Hotkey' }),
      el('div', 'sm-card-desc', {
        textContent: 'Choose a key or key combination to open and close Hydrogen.'
      })
    );

    const row = el('div', 'sm-hotkey-row');
    const value = el('span', 'sm-hotkey-value');
    const capture = el('button', 'sm-plugin-button sm-hotkey-capture', {
      type: 'button',
      textContent: 'Change shortcut'
    });
    const status = el('div', 'sm-plugin-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    let hotkey = window.SM.storage.loadHotkey();
    let recording = false;

    function render() {
      value.textContent = formatHotkey(hotkey);
      capture.classList.toggle('sm-recording', recording);
      capture.textContent = recording ? 'Press a key combination…' : 'Change shortcut';
      capture.setAttribute('aria-pressed', String(recording));
    }

    function stopRecording(message) {
      recording = false;
      render();
      status.textContent = message;
    }

    capture.addEventListener('click', () => {
      recording = !recording;
      render();
      status.textContent = recording
        ? 'Press any non-modifier key, or press Escape to cancel.'
        : '';
      if (recording) capture.focus();
    });

    capture.addEventListener('keydown', event => {
      if (!recording) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        stopRecording('Shortcut change cancelled.');
        return;
      }

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;

      const nextHotkey = {
        code: event.code,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      };

      if (!window.SM.storage.saveHotkey(nextHotkey)) {
        stopRecording('Could not save the shortcut.');
        return;
      }

      hotkey = nextHotkey;
      stopRecording('Shortcut saved.');
    });

    row.append(value, capture);
    card.append(head, row, status);
    root.appendChild(card);

    window.SM.searchIndex.push({
      id: 'menu-hotkey',
      label: 'Hotkeys',
      title: 'Menu Hotkey',
      desc: 'Change the keyboard shortcut used to open Hydrogen',
      item: { tab: 'hotkeys', selector: '#tab-hotkeys' }
    });

    render();
    return { root };
  };
})();
