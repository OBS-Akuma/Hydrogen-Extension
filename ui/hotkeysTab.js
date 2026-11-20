(() => {
  const el = window.SM.el;

  const SEQUENCE_TIMEOUT = 1500;
  const DEFAULT_HOTKEYS = {
    screenshot: ['KeyF', 'Digit1'],
    toggleMenu: ['ShiftRight']
  };

  window.SM.HOTKEY_SEQUENCE_TIMEOUT = SEQUENCE_TIMEOUT;
  window.SM.DEFAULT_HOTKEYS = DEFAULT_HOTKEYS;

  function formatKey(code) {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);

    const names = {
      AltLeft: 'Left Alt',
      AltRight: 'Right Alt',
      ArrowDown: 'Down Arrow',
      ArrowLeft: 'Left Arrow',
      ArrowRight: 'Right Arrow',
      ArrowUp: 'Up Arrow',
      ControlLeft: 'Left Ctrl',
      ControlRight: 'Right Ctrl',
      MetaLeft: 'Left Meta',
      MetaRight: 'Right Meta',
      PageDown: 'Page Down',
      PageUp: 'Page Up',
      ShiftLeft: 'Left Shift',
      ShiftRight: 'Right Shift',
      Space: 'Space'
    };

    return names[code] || code;
  }

  function formatSequence(sequence) {
    return sequence.map(formatKey).join(' then ');
  }

  window.SM.buildHotkeysTab = function ({
    initialHotkeys,
    loadError,
    onSave
  }) {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-hotkeys';

    const card = el('div', 'sm-card');
    const head = el('div', 'sm-card-head');
    head.append(
      el('div', 'sm-card-title', { textContent: 'Keyboard Shortcuts' }),
      el('div', 'sm-card-desc', {
        textContent:
          'Set a key or a two-key sequence for taking screenshots and opening or closing the menu.'
      })
    );

    const rows = new Map();
    const status = el('div', 'sm-plugin-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = loadError
      ? 'Could not load saved shortcuts: ' + loadError
      : 'Press Escape while recording to cancel.';

    let hotkeys = {
      screenshot: [...initialHotkeys.screenshot],
      toggleMenu: [...initialHotkeys.toggleMenu]
    };
    let recording = null;
    let recordingTimer = null;

    function render() {
      rows.forEach((row, action) => {
        row.value.textContent = formatSequence(hotkeys[action]);
      });
    }

    function stopRecording() {
      clearTimeout(recordingTimer);
      recordingTimer = null;

      if (recording) {
        document.removeEventListener('keydown', captureKey, true);
        recording.button.textContent = 'Change';
      }

      recording = null;
    }

    async function saveRecording() {
      if (!recording || !recording.codes.length) return;

      const { action, button, codes } = recording;
      stopRecording();

      const nextHotkeys = {
        ...hotkeys,
        [action]: [...codes]
      };

      status.textContent = 'Saving shortcut...';
      button.disabled = true;

      try {
        hotkeys = await onSave(nextHotkeys);
        render();
        status.textContent = 'Shortcut saved.';
      } catch (error) {
        console.error('[Hydrogen] Could not save shortcut:', error);
        status.textContent = 'Could not save shortcut: ' + error.message;
      } finally {
        button.disabled = false;
      }
    }

    function cancelRecording(message) {
      stopRecording();
      status.textContent = message;
    }

    function captureKey(event) {
      if (event.repeat || !recording) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.code === 'Escape') {
        cancelRecording('Shortcut recording canceled.');
        return;
      }

      if (event.code === 'Unidentified') {
        cancelRecording('That key could not be recorded. Try another key.');
        return;
      }

      recording.codes.push(event.code);
      recording.value.textContent =
        formatSequence(recording.codes) + ' ...';
      clearTimeout(recordingTimer);

      if (recording.codes.length === 2) {
        saveRecording();
      } else {
        recordingTimer = setTimeout(saveRecording, SEQUENCE_TIMEOUT);
      }
    }

    function startRecording(action, row) {
      stopRecording();
      recording = {
        action,
        button: row.button,
        codes: [],
        value: row.value
      };
      row.button.textContent = 'Press key...';
      row.value.textContent = 'Waiting for input';
      status.textContent =
        'Press one key, or press two keys in sequence. Escape cancels.';
      document.addEventListener('keydown', captureKey, true);
    }

    [
      {
        action: 'screenshot',
        label: 'Take Screenshot',
        description: 'Capture the current tab and add it to Screenshots.'
      },
      {
        action: 'toggleMenu',
        label: 'Toggle Menu',
        description: 'Open or close the Hydrogen menu.'
      }
    ].forEach(({ action, label, description }) => {
      const row = el('div', 'sm-hotkey-row');
      const details = el('div', 'sm-hotkey-details');
      const value = el('span', 'sm-hotkey-value');
      details.append(
        el('div', 'sm-card-title', { textContent: label }),
        el('div', 'sm-card-desc', { textContent: description }),
        value
      );

      const button = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Change'
      });
      row.append(details, button);
      button.addEventListener('click', () => startRecording(action, row));
      card.appendChild(row);
      rows.set(action, { button, value });
    });

    card.appendChild(status);
    root.appendChild(card);
    render();

    return {
      root,
      get isRecording() {
        return recording !== null;
      }
    };
  };
})();
