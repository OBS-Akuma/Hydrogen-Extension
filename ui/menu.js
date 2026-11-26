
(function () {
  const el = window.SM.el;

  const VERSION = chrome.runtime.getManifest().version;
  const ACCENT_COLORS = {
    blue: '#2bb0ff',
    purple: '#a855f7',
    green: '#22c55e',
    orange: '#f97316',
    pink: '#ec4899'
  };

  window.SM.createMenu = function (cardInfo = {}) {
    const overlay = el('div', 'sm-root sm-overlay');
    const win = el('div', 'sm-window');
    const styleSettings = window.SM.storage.loadStyleSettings();

    function setAppearance(settings) {
      const backgroundOpacity = Number.isInteger(
        Number(settings.background_opacity)
      ) && Number(settings.background_opacity) >= 0 &&
        Number(settings.background_opacity) <= 100
        ? Number(settings.background_opacity)
        : 35;
      const menuWidth = Number(settings.menu_width) >= 810 &&
        Number(settings.menu_width) <= 1000
        ? Number(settings.menu_width)
        : 1000;
      const menuHeight = Number(settings.menu_height) >= 400 &&
        Number(settings.menu_height) <= 1000
        ? Number(settings.menu_height)
        : 660;
      const cardOpacity = Number(settings.card_opacity) >= 0 &&
        Number(settings.card_opacity) <= 100
        ? Number(settings.card_opacity)
        : 60;
      const accentColor = ACCENT_COLORS[settings.accent_color] || ACCENT_COLORS.blue;
      const borderRadius = Number.isInteger(Number(settings.border_radius)) &&
        Number(settings.border_radius) >= 0 &&
        Number(settings.border_radius) <= 20
        ? Number(settings.border_radius)
        : 8;

      win.style.width = menuWidth + 'px';
      win.style.height = menuHeight + 'px';
      win.style.setProperty('--sm-card-opacity', String(cardOpacity / 100));
      win.style.setProperty('--sm-blue', accentColor);
      win.style.setProperty('--sm-blue-rgb', {
        '#2bb0ff': '43, 176, 255',
        '#a855f7': '168, 85, 247',
        '#22c55e': '34, 197, 94',
        '#f97316': '249, 115, 22',
        '#ec4899': '236, 72, 153'
      }[accentColor]);
      win.style.setProperty('--sm-radius', borderRadius + 'px');
      win.style.setProperty('--sm-window-radius', (borderRadius + 4) + 'px');
      win.style.setProperty(
        '--sm-bg-tint',
        `rgba(10, 10, 10, ${backgroundOpacity / 100})`
      );
    }

    setAppearance(styleSettings);

    const backgroundSettings = window.SM.storage.loadBackgroundSettings();
    const backgroundPaths = {
      default: 'Backgrounds/Default.png',
      main: 'Backgrounds/main.png',
      halloween: 'Backgrounds/halloween.webp',
      newvsoldgen: 'Backgrounds/nvo.webp',
      theykilledher: 'Backgrounds/Tkh.webp',
      verclose: 'Backgrounds/Gtmts.webp',
      ophelia: 'Backgrounds/Os.webp',
      efk: 'Backgrounds/efk.webp'
    };

    function setBackground(source) {
      win.style.backgroundImage =
        `linear-gradient(var(--sm-bg-tint), var(--sm-bg-tint)), ` +
        `url(${JSON.stringify(source)})`;
    }

    const selectedCustomBackground = backgroundSettings.custom.find(
      background => background.id === backgroundSettings.selected
    );
    setBackground(
      selectedCustomBackground
        ? selectedCustomBackground.data
        : chrome.runtime.getURL(
            backgroundPaths[backgroundSettings.selected] ||
            backgroundPaths.default
          )
    );
    win.style.backgroundSize = 'cover';
    win.style.backgroundPosition = 'center';
    win.style.backgroundRepeat = 'no-repeat';

    const pos = window.SM.storage.loadPos() || { x: 40, y: 40 };
    win.style.left = pos.x + 'px';
    win.style.top = pos.y + 'px';

    let visible = false;
    let activeTab = 'style';

    const api = {
      overlay,
      window: win,
      get visible() { return visible; },
      show,
      hide,
      toggle
    };

    const topbar = window.SM.buildTopbar({
      onClose: hide,
      onFullscreen: () => {
        const requestFullscreen = document.documentElement.requestFullscreen;
        if (typeof requestFullscreen !== 'function') {
          console.error('[SM] Fullscreen is not supported on this page.');
          return;
        }

        requestFullscreen.call(document.documentElement)
          .then(hide)
          .catch(error => {
            console.error('[SM] Could not enter website fullscreen:', error);
          });
      }
    });
    win.appendChild(topbar);

    const searchSlot = topbar.querySelector('.sm-topbar-right');
    const closeActions = searchSlot.querySelector('.sm-close-actions');

    const search = window.SM.buildSearch({
      onPick: (hit) => {
        const item = hit.item;

        const tabId =
          item && typeof item === 'object' && item.tab
            ? item.tab
            : hit.id;

        switchTab(tabId);

        requestAnimationFrame(() => {
          let target = null;

          if (item instanceof Element) {
            target = item;
          } else if (
            item &&
            typeof item === 'object' &&
            item.plugin
          ) {
            target = document.querySelector(
              '#tab-plugins [data-hydrogen-plugin="' + item.plugin + '"]'
            );
          } else if (
            item &&
            typeof item === 'object' &&
            item.selector
          ) {
            target = document.querySelector(item.selector);
          }

          if (!target) return;

          if (target.tagName === 'DETAILS') {
            target.open = true;
          }

          target.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
          });

          target.classList.remove('sm-flash');
          void target.offsetWidth;
          target.classList.add('sm-flash');

          setTimeout(() => {
            target.classList.remove('sm-flash');
          }, 1400);
        });
      }
    });

    searchSlot.insertBefore(search.root, closeActions);

    const main = el('div', 'sm-main');

    const sidebar = window.SM.buildSidebar({
      active: activeTab,
      version: VERSION,
      initialLabels: styleSettings.sidebar_labels,
      onSelect: switchTab,
      onLabelsChange: async enabled => {
        const settings = window.SM.storage.loadStyleSettings();
        settings.sidebar_labels = enabled;
        return window.SM.storage.saveStyleSettings(settings);
      }
    });

    main.appendChild(sidebar);

    const content = el('div', 'sm-content');

    const styleTab = window.SM.buildStyleTab({
      initialCss: window.SM.storage.loadCss(),
      initialSettings: styleSettings,
      tabId: 'style',
      tabLabel: 'Style'
    });

    content.appendChild(styleTab.root);

    const pluginsTab = el('div', 'sm-tab-content');
    pluginsTab.id = 'tab-plugins';

    content.appendChild(pluginsTab);

    const favoritesTab = el('div', 'sm-tab-content');
    favoritesTab.id = 'tab-favorites';
    const favoritesList = el('div', 'sm-favorites-list');
    const favoritesEmpty = el('div', 'sm-favorites-empty', {
      textContent: 'Use the heart buttons on cards to save them here.'
    });
    favoritesTab.append(favoritesEmpty, favoritesList);
    content.appendChild(favoritesTab);

    const clientTab = window.SM.buildClientTab({
      initialBackgroundSettings: backgroundSettings,
      initialStyleSettings: styleSettings,
      onBackgroundChange: setBackground,
      onAppearanceChange: setAppearance
    });
    content.appendChild(clientTab.root);

    const hotkeysTab = window.SM.buildHotkeysTab();
    content.appendChild(hotkeysTab.root);

    main.appendChild(content);
    win.appendChild(main);
    overlay.appendChild(win);

    function ordinal(number) {
      const remainder = number % 100;

      if (remainder >= 11 && remainder <= 13) {
        return number + 'th';
      }

      return number + (['th', 'st', 'nd', 'rd'][number % 10] || 'th');
    }

    function createInfoButton(card, title, description) {
      const button = el('button', 'sm-info', {
        type: 'button'
      });
      button.setAttribute('aria-label', 'More information about ' + title);

      const icon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      );
      icon.classList.add('sm-info-icon');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');

      const tip = el('span', 'sm-info-tip');
      const location = el('span', 'sm-info-location');
      const body = el('span', 'sm-info-body', {
        textContent: description
      });
      const hint = el('span', 'sm-info-hint', {
        textContent: 'Click to copy'
      });

      tip.append(location, body, hint);
      button.append(icon, tip);

      function setIcon(copied) {
        icon.replaceChildren();

        if (copied) {
          const check = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          );
          check.setAttribute('d', 'M20 6 9 17l-5-5');
          icon.appendChild(check);
          return;
        }

        const circle = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle'
        );
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '10');

        const line = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line'
        );
        line.setAttribute('x1', '12');
        line.setAttribute('y1', '16');
        line.setAttribute('x2', '12');
        line.setAttribute('y2', '12');

        const dot = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'line'
        );
        dot.setAttribute('x1', '12');
        dot.setAttribute('y1', '8');
        dot.setAttribute('x2', '12.01');
        dot.setAttribute('y2', '8');

        icon.append(circle, line, dot);
      }

      function getLocation() {
        const tab = card.closest('.sm-tab-content');
        const cards = tab
          ? Array.from(tab.querySelectorAll('.sm-card'))
          : [];
        const tabName = tab?.id === 'tab-plugins' ? 'Plugins' : 'Style';

        return `${tabName} tab > ${ordinal(cards.indexOf(card) + 1)} card`;
      }

      function updateLocation() {
        location.textContent = getLocation();
      }

      let resetTimer = null;
      button.addEventListener('mouseenter', updateLocation);
      button.addEventListener('focus', updateLocation);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        updateLocation();

        const text = `${location.textContent}: ${title}\nHow to use: ${description}`;
        const fallbackCopy = () => {
          const input = el('textarea');
          input.value = text;
          input.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
          document.body.appendChild(input);
          input.select();

          try {
            document.execCommand('copy');
          } catch (error) {
            console.warn('[SM] Could not copy card info:', error);
          }

          input.remove();
        };

        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(fallbackCopy);
        } else {
          fallbackCopy();
        }

        button.classList.add('sm-copied');
        setIcon(true);
        hint.textContent = 'Copied!';

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          button.classList.remove('sm-copied');
          setIcon(false);
          hint.textContent = 'Click to copy';
        }, 1600);
      });

      setIcon(false);
      return button;
    }

    function addCardInfo(card) {
      card.querySelectorAll('.sm-card-title').forEach(titleElement => {
        if (titleElement.querySelector('.sm-info')) return;

        const title = titleElement.textContent.trim();
        const description = cardInfo[title];

        if (typeof description !== 'string' || !description) return;

        titleElement.appendChild(
          createInfoButton(card, title, description)
        );
      });
    }

    let favorites = window.SM.storage.loadFavorites();
    let favoritesSignature = '';

    function cardTitle(card) {
      const titleElement = card.querySelector('.sm-card-title');
      if (!titleElement) return 'Untitled card';
      const text = Array.from(titleElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('')
        .trim();
      return text || titleElement.textContent.trim();
    }

    function favoriteId(card, tab) {
      if (card.dataset.hydrogenFavoriteId) {
        return card.dataset.hydrogenFavoriteId;
      }

      const pluginId = card.dataset.hydrogenPlugin;
      const titleKey = cardTitle(card)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
      card.dataset.hydrogenFavoriteId = pluginId
        ? 'plugin:' + pluginId
        : tab.id + ':' + (titleKey || 'card');
      return card.dataset.hydrogenFavoriteId;
    }

    function renderFavorites() {
      const cards = Array.from(
        overlay.querySelectorAll('.sm-tab-content .sm-card')
      ).filter(card => {
        const tab = card.closest('.sm-tab-content');
        return tab && tab.id !== 'tab-favorites' && tab.id !== 'tab-hotkeys';
      });
      const byId = new Map(cards.map(card => {
        const tab = card.closest('.sm-tab-content');
        return [favoriteId(card, tab), { card, tab }];
      }));
      const entries = favorites
        .map(id => {
          const entry = byId.get(id);
          return entry
            ? {
                id,
                card: entry.card,
                tab: entry.tab,
                title: cardTitle(entry.card)
              }
            : null;
        })
        .filter(Boolean);
      const signature = JSON.stringify(entries.map(({ id, title }) => [id, title]));
      if (signature === favoritesSignature) return;
      favoritesSignature = signature;
      favoritesEmpty.hidden = entries.length > 0;
      favoritesList.replaceChildren();

      entries.forEach(entry => {
        const button = el('button', 'sm-favorite-link', {
          type: 'button',
          textContent: entry.title
        });
        button.appendChild(el('span', 'sm-favorite-location', {
          textContent: entry.tab.id.replace('tab-', '')
        }));
        button.addEventListener('click', () => {
          switchTab(entry.tab.id.replace('tab-', ''));
          entry.card.scrollIntoView({ block: 'center', behavior: 'smooth' });
          entry.card.classList.add('sm-flash');
          setTimeout(() => entry.card.classList.remove('sm-flash'), 1400);
        });
        favoritesList.appendChild(button);
      });
    }

    function addFavoriteButton(card) {
      const title = card.querySelector('.sm-card-title');
      const tab = card.closest('.sm-tab-content');
      if (
        !title ||
        !tab ||
        tab.id === 'tab-favorites' ||
        tab.id === 'tab-hotkeys' ||
        title.closest('summary') ||
        title.querySelector('.sm-favorite-btn')
      ) {
        return;
      }

      const id = favoriteId(card, tab);
      const button = el('button', 'sm-favorite-btn', {
        type: 'button',
        title: 'Add to favorites'
      });
      button.setAttribute('aria-label', 'Add ' + cardTitle(card) + ' to favorites');
      const icon = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      );
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.setAttribute(
        'd',
        'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z'
      );
      icon.appendChild(path);
      button.appendChild(icon);

      function syncFavorite() {
        const selected = favorites.includes(id);
        button.classList.toggle('sm-favorited', selected);
        button.title = selected ? 'Remove from favorites' : 'Add to favorites';
        button.setAttribute(
          'aria-label',
          (selected ? 'Remove ' : 'Add ') + cardTitle(card) + ' ' +
          (selected ? 'from' : 'to') + ' favorites'
        );
        button.setAttribute('aria-pressed', String(selected));
      }

      button.addEventListener('click', () => {
        const previous = favorites;
        favorites = favorites.includes(id)
          ? favorites.filter(favorite => favorite !== id)
          : favorites.concat(id);
        if (!window.SM.storage.saveFavorites(favorites)) {
          favorites = previous;
          console.error('[SM] Could not save favorites.');
        }
        syncFavorite();
        renderFavorites();
      });

      title.appendChild(button);
      syncFavorite();
    }

    function updateCardInfo() {
      overlay.querySelectorAll('.sm-card').forEach(card => {
        addFavoriteButton(card);
        addCardInfo(card);
      });
      renderFavorites();
    }

    updateCardInfo();

    const cardInfoObserver = new MutationObserver(updateCardInfo);
    cardInfoObserver.observe(overlay, {
      childList: true,
      subtree: true
    });

    window.SM.makeDraggable(win, topbar, {
      onMove: (x, y) => {
        window.SM.storage.savePos(x, y);
      }
    });

    ['keydown', 'keyup', 'keypress'].forEach((type) => {
      overlay.addEventListener(type, (e) => {
        const t = e.target;

        if (
          t &&
          t.matches &&
          t.matches('input, textarea, select') &&
          e.key !== 'Escape'
        ) {
          e.stopPropagation();
        }
      });
    });

    function switchTab(tabId) {
      if (tabId === activeTab) return;

      activeTab = tabId;

      sidebar.querySelectorAll('.sm-tab-btn').forEach((button) => {
        button.classList.toggle(
          'sm-active',
          button.dataset.tab === tabId
        );
      });

      content.querySelectorAll('.sm-tab-content').forEach((tab) => {
        tab.classList.toggle(
          'sm-active',
          tab.id === 'tab-' + tabId
        );
      });

      content.scrollTop = 0;
    }

    function show() {
      if (visible) return;

      if (!overlay.isConnected) {
        document.body.appendChild(overlay);
      }

      window.SM.injector.flush(styleTab.textarea.value);

      overlay.classList.add('sm-visible');

      requestAnimationFrame(() => {
        win.classList.add('sm-open');
      });

      visible = true;

      setTimeout(() => {
        if (activeTab === 'style') {
          styleTab.textarea.focus();
        }
      }, 80);
    }

    function hide() {
      if (!visible) return;

      win.classList.remove('sm-open');
      visible = false;

      setTimeout(() => {
        if (!visible) {
          overlay.classList.remove('sm-visible');
        }
      }, 260);
    }

    function toggle() {
      visible ? hide() : show();
    }

    return api;
  };
})();
