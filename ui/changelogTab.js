(function () {
  const el = window.SM.el;

  function formatDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return 'Date unavailable';

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  function formatHotkey(hotkey) {
    const names = {
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
    return names[hotkey.code] ||
      hotkey.code.replace(/^(Key|Digit|Numpad)/, '');
  }

  window.SM.buildChangelogTab = function ({
    onSelectTab,
    onDismissWelcome,
    initialFont = 'kanit',
    onFontChange,
    welcomeDismissed = false
  }) {
    const root = el('div', 'sm-tab-content sm-active sm-changelog-tab');
    root.id = 'tab-changelog';

    const layout = el('div', 'sm-changelog-layout');
    const welcome = el('section', 'sm-changelog-welcome');

    welcome.append(
      el('div', 'sm-changelog-eyebrow', {
        textContent: 'START HERE'
      }),
      el('h1', 'sm-changelog-welcome-title', {
        textContent: 'Welcome to Hydrogen!'
      }),
      el('p', 'sm-changelog-welcome-copy', {
        textContent:
          'Personalize your game, discover useful features, and make the menu yours. Pick a place to begin.'
      })
    );

    const fontRow = el(
      'div',
      'sm-changelog-start-item sm-changelog-font-row'
    );
    const fontDetails = el('div', 'sm-changelog-start-details');
    fontDetails.append(
      el('div', 'sm-changelog-start-title', {
        textContent: 'Menu font'
      }),
      el('div', 'sm-changelog-start-description', {
        textContent: 'Choose a font for the Hydrogen menu.'
      })
    );
    let selectedFont = ['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(
      initialFont
    ) ? initialFont : 'kanit';
    const fontChoices = [
      { value: 'kanit', label: 'Kanit' },
      { value: 'gill-sans-mt', label: 'Gill Sans MT' },
      { value: 'open-dyslexic', label: 'OpenDyslexic' }
    ];
    const fontDropdown = el('details', 'sm-client-background-picker sm-client-font-picker');
    const fontTrigger = el('summary', 'sm-client-background-trigger');
    const fontLabel = el('span', 'sm-client-background-current');
    fontTrigger.appendChild(fontLabel);
    const fontOptions = el('div', 'sm-client-background-options');
    fontOptions.setAttribute('role', 'listbox');
    fontDropdown.append(fontTrigger, fontOptions);

    function renderWelcomeFontOptions() {
      const selected = fontChoices.find(choice => choice.value === selectedFont) ||
        fontChoices[0];
      fontLabel.textContent = selected.label;
      fontTrigger.setAttribute('aria-label', 'Menu font: ' + selected.label);
      fontOptions.replaceChildren();
      fontChoices.forEach(choice => {
        const isSelected = choice.value === selectedFont;
        const button = el('button', 'sm-client-background-option', {
          type: 'button',
          textContent: choice.label
        });
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(isSelected));
        button.addEventListener('click', () => {
          selectedFont = choice.value;
          fontDropdown.open = false;
          fontTrigger.focus();
          renderWelcomeFontOptions();
          onFontChange?.(choice.value);
        });
        fontOptions.appendChild(button);
      });
    }
    renderWelcomeFontOptions();
    fontRow.append(fontDetails, fontDropdown);

    const steps = el('div', 'sm-changelog-start-list');
    [
      {
        title: 'Customize your style',
        description: 'Adjust the interface and menu appearance.',
        tab: 'style',
        action: 'Open Style'
      },
      {
        title: 'Explore plugins',
        description: 'Choose tools and features for your game.',
        tab: 'plugins',
        action: 'View Plugins'
      },
      {
        title: 'Set your menu hotkey',
        description: 'Current shortcut: ',
        tab: 'hotkeys',
        action: 'Change'
      }
    ].forEach(step => {
      const row = el('div', 'sm-changelog-start-item');
      const details = el('div', 'sm-changelog-start-details');
      const description = el('div', 'sm-changelog-start-description', {
        textContent: step.description
      });
      if (step.tab === 'hotkeys') {
        description.appendChild(el('strong', 'sm-changelog-hotkey-value', {
          textContent: formatHotkey(window.SM.storage.loadHotkey())
        }));
      }
      details.append(
        el('div', 'sm-changelog-start-title', {
          textContent: step.title
        }),
        description
      );
      const button = el('button', 'sm-changelog-start-button', {
        type: 'button',
        textContent: step.action
      });
      button.addEventListener('click', () => onSelectTab(step.tab));
      row.append(details, button);
      steps.appendChild(row);
    });
    steps.prepend(fontRow);

    const welcomeFooter = el('div', 'sm-changelog-welcome-footer');
    welcomeFooter.append(
      el('span', null, {
        textContent: "I've been here before. I know what I'm doing."
      })
    );
    const skipButton = el('button', 'sm-changelog-skip', {
      type: 'button',
      textContent: 'Skip setup'
    });
    skipButton.addEventListener('click', () => {
      if (onDismissWelcome?.()) {
        setWelcomeVisible(false);
      }
    });
    welcomeFooter.appendChild(skipButton);
    welcome.append(steps, welcomeFooter);

    const feed = el('section', 'sm-changelog-feed');
    const feedHeader = el('div', 'sm-changelog-feed-header');
    feedHeader.append(
      el('div', 'sm-changelog-eyebrow', {
        textContent: 'LATEST UPDATES'
      }),
      el('h2', 'sm-changelog-feed-title', {
        textContent: 'Changelog'
      }),
      el('p', 'sm-changelog-feed-description', {
        textContent: 'Recent changes and the Kirka versions they support.'
      })
    );

    const feedStatus = el('div', 'sm-changelog-status', {
      textContent: 'Loading release notes…'
    });
    feedStatus.setAttribute('role', 'status');
    feedStatus.setAttribute('aria-live', 'polite');

    const retryButton = el('button', 'sm-changelog-retry', {
      type: 'button',
      textContent: 'Try again'
    });
    retryButton.hidden = true;

    const releaseList = el('div', 'sm-changelog-list');
    feed.append(feedHeader, feedStatus, retryButton, releaseList);
    layout.append(welcome, feed);
    root.appendChild(layout);

    let loaded = false;
    function renderReleases(releases) {
      releaseList.replaceChildren();

      if (!releases.length) {
        feedStatus.textContent = 'No release notes are available yet.';
        loaded = true;
        return;
      }

      releases.forEach(release => {
        const body = typeof release.body === 'string' ? release.body : '';
        const compatibility = body.match(/\[kv:([^\]]+)\]/i);
        const tags = Array.from(
          body.matchAll(/\[(?!kv:)([A-Z][A-Z0-9 _-]*)\]/gi),
          match => match[1].trim().toUpperCase()
        ).filter((tag, index, list) => tag && list.indexOf(tag) === index);
        const notes = body
          .replace(/\[(?:kv:[^\]]+|[A-Z][A-Z0-9 _-]*)\]/gi, '')
          .trim();
        const entry = el('article', 'sm-changelog-entry');
        const meta = el('div', 'sm-changelog-entry-meta');
        const date = el('time', 'sm-changelog-date', {
          textContent: formatDate(release.date)
        });
        if (release.date) date.dateTime = release.date;
        meta.appendChild(date);

        if (compatibility) {
          meta.appendChild(el('span', 'sm-changelog-compatibility', {
            textContent: 'Works with Kirka v' + compatibility[1].trim()
          }));
        }
        tags.forEach(tag => {
          meta.appendChild(el('span', 'sm-changelog-tag', {
            textContent: tag
          }));
        });

        entry.append(
          meta,
          el('div', 'sm-changelog-release-body', {
            textContent: notes || 'No release notes were provided.'
          })
        );
        releaseList.appendChild(entry);
      });

      feedStatus.textContent = '';
      loaded = true;
    }

    let loading = false;
    async function loadReleases() {
      if (loading || loaded) return;
      loading = true;
      retryButton.disabled = true;
      retryButton.hidden = true;
      feedStatus.textContent = 'Loading release notes…';

      try {
        const result = await chrome.runtime.sendMessage({
          type: 'hydrogen.getChangelogs'
        });
        if (result?.error || !Array.isArray(result?.releases)) {
          throw new Error(result?.error || 'Invalid release notes response');
        }

        renderReleases(result.releases);
      } catch (error) {
        console.warn('[SM] Could not load release notes:', error);
        feedStatus.textContent =
          'Could not load release notes. Check your connection and try again.';
        retryButton.hidden = false;
      } finally {
        loading = false;
        retryButton.disabled = false;
      }
    }

    retryButton.addEventListener('click', loadReleases);

    function setWelcomeVisible(visible) {
      welcome.hidden = !visible;
      feed.hidden = visible;
      layout.classList.toggle('sm-changelog-welcome-only', visible);
      layout.classList.toggle('sm-changelog-no-welcome', !visible);
      if (!visible) void loadReleases();
    }

    function updateHotkey() {
      const value = welcome.querySelector('.sm-changelog-hotkey-value');
      if (value) {
        value.textContent = formatHotkey(window.SM.storage.loadHotkey());
      }
    }

    function setFont(font) {
      if (['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(font)) {
        selectedFont = font;
        renderWelcomeFontOptions();
      }
    }

    setWelcomeVisible(!welcomeDismissed);
    window.addEventListener('hydrogen-hotkey-change', updateHotkey);

    window.SM.searchIndex.push({
      id: 'changelog',
      label: 'Changelog',
      title: 'Changelog',
      desc: 'Recent Hydrogen updates and supported Kirka versions',
      item: { tab: 'changelog', selector: '#tab-changelog' }
    });

    return { root, setWelcomeVisible, updateHotkey, setFont };
  };
})();
