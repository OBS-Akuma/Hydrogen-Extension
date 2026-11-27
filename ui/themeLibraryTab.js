(() => {
  const el = window.SM.el;
  const THEME_API =
    'https://raw.githubusercontent.com/imnotkoolkid/KCH/refs/heads/main/data/css.json';

  function fallbackCopy(text) {
    const input = el('textarea');
    input.value = text;
    input.style.cssText =
      'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('[ThemeLibrary] Could not copy CSS:', error);
    }
    input.remove();
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    fallbackCopy(text);
  }

  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }

  function themeFileName(theme) {
    const title = String(theme.title || 'theme')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
    return (title || 'theme') + '.css';
  }

  window.SM.buildThemeLibraryTab = function ({ styleTab } = {}) {
    const root = el('div', 'sm-tab-content sm-theme-library');
    root.id = 'tab-themes';

    const head = el('div', 'sm-theme-library-head');
    const heading = el('div', 'sm-theme-library-heading', {
      textContent: 'Theme Library'
    });
    const count = el('div', 'sm-theme-library-count', {
      textContent: 'Loading themes...'
    });
    head.append(heading, count);

    const status = el('div', 'sm-theme-library-status', {
      textContent: 'Loading themes...'
    });
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const grid = el('div', 'sm-theme-grid');
    root.append(head, status, grid);

    function setStatus(message, isError = false) {
      status.textContent = message;
      status.hidden = !message;
      status.classList.toggle('sm-error', isError);
    }

    async function copyTheme(theme, button) {
      if (!theme.downloadUrl) return;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Copying...';

      try {
        const css = await fetchText(theme.downloadUrl);
        await copyText(css);
        button.textContent = 'Copied';
        setStatus(theme.title + ' CSS copied.');
      } catch (error) {
        console.error('[ThemeLibrary] Could not copy theme:', error);
        button.textContent = 'Copy failed';
        setStatus('Could not copy ' + theme.title + '.', true);
      }

      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 1600);
    }

    async function applyTheme(theme, button) {
      if (!theme.downloadUrl ||
        typeof styleTab?.addFile !== 'function') return;
      const original = button.textContent;
      button.disabled = true;
      button.textContent = 'Applying...';
      let succeeded = false;

      try {
        const css = await fetchText(theme.downloadUrl);
        styleTab.addFile(themeFileName(theme), css, true);
        button.textContent = 'Remove CSS';
        button.classList.remove('sm-theme-apply');
        button.classList.add('sm-theme-remove');
        succeeded = true;
        setStatus(theme.title + ' added to CSS Files.');
      } catch (error) {
        console.error('[ThemeLibrary] Could not apply theme:', error);
        button.textContent = 'Apply failed';
        setStatus('Could not apply ' + theme.title + '.', true);
      }

      setTimeout(() => {
        if (!succeeded) {
          button.textContent = original;
          button.classList.remove('sm-theme-remove');
          button.classList.add('sm-theme-apply');
        }
        button.disabled = false;
      }, 1600);
    }

    function removeTheme(theme, button) {
      if (typeof styleTab?.removeFile !== 'function') return;
      button.disabled = true;

      if (!styleTab.removeFile(themeFileName(theme))) {
        button.disabled = false;
        setStatus(theme.title + ' is not in CSS Files.', true);
        return;
      }

      button.textContent = 'Apply CSS';
      button.classList.remove('sm-theme-remove');
      button.classList.add('sm-theme-apply');
      button.disabled = false;
      setStatus(theme.title + ' removed from CSS Files.');
    }

    function makeThemeCard(theme) {
      const card = el('article', 'sm-card sm-theme-card');
      card.dataset.hydrogenTheme =
        String(theme.title || '').toLowerCase();

      const preview = el('div', 'sm-theme-preview');
      const previewUrl =
        theme.homeImage || theme.ingameImage || '';
      if (previewUrl) {
        preview.style.backgroundImage = `url("${previewUrl}")`;
      }

      const title = el('div', 'sm-card-title', {
        textContent: theme.title || 'Untitled theme'
      });
      const description = el('div', 'sm-card-desc', {
        textContent: theme.description || ''
      });

      const tags = el('div', 'sm-theme-tags');
      (Array.isArray(theme.tags) ? theme.tags : []).forEach(tag => {
        tags.appendChild(el('span', 'sm-theme-tag', {
          textContent: tag
        }));
      });

      const actions = el('div', 'sm-theme-actions');
      const copyButton = el('button', 'sm-plugin-button sm-theme-copy', {
        type: 'button',
        textContent: 'Copy CSS'
      });
      const applyButton = el('button', 'sm-plugin-button sm-theme-apply', {
        type: 'button',
        textContent: 'Apply CSS'
      });
      const fileName = themeFileName(theme);
      const isApplied =
        typeof styleTab?.hasFile === 'function' &&
        styleTab.hasFile(fileName);
      if (isApplied) {
        applyButton.textContent = 'Remove CSS';
        applyButton.classList.remove('sm-theme-apply');
        applyButton.classList.add('sm-theme-remove');
      }
      copyButton.addEventListener('click', () =>
        copyTheme(theme, copyButton)
      );
      applyButton.addEventListener('click', () => {
        const removeMode =
          typeof styleTab?.hasFile === 'function' &&
          styleTab.hasFile(themeFileName(theme));
        if (removeMode) {
          removeTheme(theme, applyButton);
        } else {
          applyTheme(theme, applyButton);
        }
      });
      actions.append(copyButton, applyButton);

      const meta = el('div', 'sm-theme-meta');
      if (theme.owner) {
        meta.appendChild(el('span', null, {
          textContent: 'by ' + theme.owner
        }));
      }
      if (theme.discord) {
        meta.appendChild(el('a', 'sm-theme-discord', {
          href: theme.discord,
          target: '_blank',
          rel: 'noopener noreferrer',
          textContent: 'Discord'
        }));
      }

      card.append(preview, title, description, tags, actions, meta);
      return card;
    }

    async function loadThemes() {
      try {
        const response = await fetch(THEME_API);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Theme data must be an array');
        }

        const themes = data.filter(theme => {
          if (!theme || typeof theme !== 'object') return false;
          const availability =
            String(theme.availability || '').trim().toLowerCase();
          return availability !== 'showcase' &&
            availability !== 'paid';
        });

        grid.replaceChildren();
        themes.forEach(theme => {
          const card = makeThemeCard(theme);
          grid.appendChild(card);
          window.SM.searchIndex.push({
            id: 'theme-' + theme.title,
            label: 'Theme Library',
            title: theme.title || 'Untitled theme',
            desc:
              (theme.description || '') + ' ' +
              (Array.isArray(theme.tags) ? theme.tags.join(' ') : ''),
            item: card
          });
        });

        count.textContent =
          themes.length + ' ' +
          (themes.length === 1 ? 'theme' : 'themes');
        setStatus(
          themes.length ? '' : 'No free themes are available.'
        );
      } catch (error) {
        console.error('[ThemeLibrary] Could not load themes:', error);
        count.textContent = 'Unavailable';
        setStatus('Could not load the Theme Library.', true);
      }
    }

    loadThemes();
    return { root };
  };
})();
