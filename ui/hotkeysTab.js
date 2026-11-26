(function () {
  const el = window.SM.el;

  function formatHotkey(hotkey) {
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
    return keyNames[hotkey.code] ||
      hotkey.code.replace(/^(Key|Digit|Numpad)/, '');
  }

  window.SM.buildHotkeysTab = function () {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-hotkeys';

    const card = el('div', 'sm-card');
    const head = el('div', 'sm-card-head');
    head.append(
      el('div', 'sm-card-title', { textContent: 'Menu Hotkey' }),
      el('div', 'sm-card-desc', {
        textContent: 'Choose one key to open and close Hydrogen.'
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
      capture.textContent = recording ? 'Press one key…' : 'Change shortcut';
      capture.setAttribute('aria-pressed', String(recording));
    }

    function stopRecording(message) {
      recording = false;
      document.removeEventListener('keydown', recordKey, true);
      render();
      status.textContent = message;
    }

    function recordKey(event) {
      if (!recording) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        stopRecording('');
        return;
      }

      if (!event.code || !/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(event.code)) {
        status.textContent = 'That key cannot be used. Press one other key.';
        return;
      }

      const nextHotkey = { code: event.code };
      if (!window.SM.storage.saveHotkey(nextHotkey)) {
        stopRecording('Could not save the shortcut.');
        return;
      }

      hotkey = nextHotkey;
      window.dispatchEvent(new CustomEvent('hydrogen-hotkey-change'));
      stopRecording('');
    }

    capture.addEventListener('click', () => {
      if (recording) {
        stopRecording('');
        return;
      }
      recording = !recording;
      render();
      status.textContent = recording
        ? 'Press a single key. Press Escape to cancel.'
        : '';
      if (recording) {
        document.addEventListener('keydown', recordKey, true);
      }
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
