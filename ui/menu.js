
(function () {
  const el = window.SM.el;

  const VERSION = chrome.runtime.getManifest().version;
  const WELCOME_DISMISSED_KEY = 'sm_welcome_screen_dismissed';
  const ACCENT_COLORS = {
    blue: '#2bb0ff',
    purple: '#a855f7',
    green: '#22c55e',
    orange: '#f97316',
    pink: '#ec4899'
  };
  const SURFACE_COLORS = {
    default: {
      rgb: '21, 21, 21',
      surface: '#151515',
      field: '#0b0b0b',
      line: '#1f1f1f',
      lineStrong: '#2c2c2c'
    },
    blue: {
      rgb: '18, 44, 60',
      surface: '#122c3c',
      field: '#081a25',
      line: '#193344',
      lineStrong: '#27495c'
    },
    purple: {
      rgb: '37, 27, 53',
      surface: '#251b35',
      field: '#140e20',
      line: '#30233f',
      lineStrong: '#45345a'
    },
    green: {
      rgb: '25, 48, 32',
      surface: '#193020',
      field: '#0c190f',
      line: '#23402c',
      lineStrong: '#345b3f'
    },
    orange: {
      rgb: '54, 36, 20',
      surface: '#362414',
      field: '#1d1309',
      line: '#49311b',
      lineStrong: '#644525'
    },
    pink: {
      rgb: '53, 26, 43',
      surface: '#351a2b',
      field: '#1c0c16',
      line: '#49243a',
      lineStrong: '#633450'
    }
  };

  function parseHexColor(value) {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
      return null;
    }

    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16)
    ];
  }

  function rgbToHex(rgb) {
    return '#' + rgb
      .map(value => Math.round(value).toString(16).padStart(2, '0'))
      .join('');
  }

  function createCustomSurfaceColor(value) {
    const color = parseHexColor(value);
    if (!color) return null;

    const blend = (base, amount) =>
      base.map((value, index) =>
        Math.round(value + (color[index] - value) * amount)
      );
    const surface = blend([10, 10, 10], 0.2);
    const field = blend([8, 8, 8], 0.08);
    const line = blend([31, 31, 31], 0.2);
    const lineStrong = blend([44, 44, 44], 0.3);
    const active = blend([28, 28, 28], 0.25);

    return {
      rgb: surface.join(', '),
      surface: rgbToHex(surface),
      field: rgbToHex(field),
      line: rgbToHex(line),
      lineStrong: rgbToHex(lineStrong),
      active: rgbToHex(active)
    };
  }

  window.SM.createMenu = function (cardInfo = {}) {
    const overlay = el('div', 'sm-root sm-overlay');
    const win = el('div', 'sm-window');
    const styleSettings = window.SM.storage.loadStyleSettings();
    let welcomeDismissed = false;
    try {
      welcomeDismissed =
        localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true';
    } catch (error) {
      console.error('[SM] Could not read welcome screen setting:', error);
    }

    function saveWelcomeDismissed(value) {
      try {
        if (value) {
          localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
        } else {
          localStorage.removeItem(WELCOME_DISMISSED_KEY);
        }
        welcomeDismissed = value;
        return true;
      } catch (error) {
        console.error('[SM] Could not save welcome screen setting:', error);
        return false;
      }
    }

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
      const accentColor = ACCENT_COLORS[settings.accent_color] ||
        (parseHexColor(settings.accent_color)
          ? settings.accent_color
          : ACCENT_COLORS.blue);
      const accentRgb = parseHexColor(accentColor)?.join(', ') ||
        '43, 176, 255';
      const surface = SURFACE_COLORS[settings.surface_color] ||
        createCustomSurfaceColor(settings.surface_color) ||
        SURFACE_COLORS.default;
      const borderRadius = Number.isInteger(Number(settings.border_radius)) &&
        Number(settings.border_radius) >= 0 &&
        Number(settings.border_radius) <= 20
        ? Number(settings.border_radius)
        : 16;

      win.style.width = menuWidth + 'px';
      win.style.height = menuHeight + 'px';
      win.style.setProperty('--sm-card-opacity', String(cardOpacity / 100));
      win.style.setProperty('--sm-blue', accentColor);
      win.style.setProperty('--sm-blue-rgb', accentRgb);
      win.style.setProperty('--sm-surface-rgb', surface.rgb);
      win.style.setProperty('--sm-surface-color', surface.surface);
      win.style.setProperty('--sm-field', surface.field);
      win.style.setProperty('--sm-line', surface.line);
      win.style.setProperty('--sm-line-strong', surface.lineStrong);
      win.style.setProperty('--sm-active-color', {
        default: '#1c1c1c',
        blue: '#193c52',
        purple: '#342646',
        green: '#21412b',
        orange: '#493116',
        pink: '#49243a'
      }[settings.surface_color] || surface.active || '#1c1c1c');
      win.style.setProperty('--sm-radius', borderRadius + 'px');
      win.style.setProperty('--sm-window-radius', borderRadius + 'px');
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
      efk: 'Backgrounds/efk.webp',
      juice: 'Backgrounds/Juice.webp'
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
    let activeTab = 'changelog';

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
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(error => {
            console.error('[SM] Could not exit website fullscreen:', error);
          });
          return;
        }

        const requestFullscreen = document.documentElement.requestFullscreen;
        if (typeof requestFullscreen !== 'function') {
          console.error('[SM] Fullscreen is not supported on this page.');
          return;
        }

        requestFullscreen.call(document.documentElement)
          .catch(error => {
            console.error('[SM] Could not enter website fullscreen:', error);
          });
      }
    });
    const fullscreenButton = topbar.querySelector('.sm-fullscreen');
    function syncFullscreenButton() {
      const label = document.fullscreenElement
        ? 'Exit website fullscreen'
        : 'Enter website fullscreen';
      fullscreenButton.title = label;
      fullscreenButton.setAttribute('aria-label', label);
    }
    document.addEventListener('fullscreenchange', syncFullscreenButton);
    syncFullscreenButton();
    win.appendChild(topbar);

    const searchSlot = topbar.querySelector('.sm-topbar-right');
    const closeActions = searchSlot.querySelector('.sm-close-actions');

    const search = window.SM.buildSearch({
      isFavorited: hit => {
        const item = hit.item;
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

        const card = target?.closest('.sm-card') ||
          target?.querySelector('.sm-card');
        const tab = card?.closest('.sm-tab-content');
        return !!card && !!tab &&
          favorites.includes(favoriteId(card, tab));
      },
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

    const sidebarControls = window.SM.buildSidebar({
      active: activeTab,
      version: VERSION,
      versionTarget: topbar.querySelector('.sm-title-version'),
      onSelect: switchTab
    });
    const sidebar = sidebarControls.root;
    sidebarControls.setLabels(styleSettings.sidebar_labels);
    sidebarControls.setTabLabel(
      'changelog',
      welcomeDismissed ? 'Changelog' : 'Home'
    );
    sidebarControls.setTabIcon(
      'changelog',
      welcomeDismissed ? 'pen-to-square' : 'house'
    );
    sidebarControls.setTabGroupTitleVisible('changelog', !welcomeDismissed);

    main.appendChild(sidebar);

    const content = el('div', 'sm-content');

    const changelogTab = window.SM.buildChangelogTab({
      onSelectTab: switchTab,
      welcomeDismissed,
      onDismissWelcome: () => {
        if (!saveWelcomeDismissed(true)) return false;
        sidebarControls.setTabLabel('changelog', 'Changelog');
        sidebarControls.setTabIcon('changelog', 'pen-to-square');
        sidebarControls.setTabGroupTitleVisible('changelog', false);
        return true;
      }
    });
    content.appendChild(changelogTab.root);

    const styleTab = window.SM.buildStyleTab({
      initialCss: window.SM.storage.loadCss(),
      initialSettings: styleSettings,
      tabId: 'style',
      tabLabel: 'Style'
    });
    styleTab.root.classList.remove('sm-active');

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
      onAppearanceChange: setAppearance,
      onSidebarLabelsChange: sidebarControls.setLabels,
      onRestoreWelcome: () => {
        if (!saveWelcomeDismissed(false)) return false;
        changelogTab.setWelcomeVisible(true);
        sidebarControls.setTabLabel('changelog', 'Home');
        sidebarControls.setTabIcon('changelog', 'house');
        sidebarControls.setTabGroupTitleVisible('changelog', true);
        switchTab('changelog');
        return true;
      }
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
        const tabName = {
          'tab-changelog': 'Changelog',
          'tab-plugins': 'Plugins',
          'tab-hotkeys': 'Hotkeys',
          'tab-client': 'Client'
        }[tab?.id] || 'Style';

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
      const hasFavorites = entries.length > 0;
      favoritesEmpty.hidden = hasFavorites;
      favoritesTab.hidden = !hasFavorites;
      sidebarControls.setTabVisible('favorites', hasFavorites);
      favoritesList.replaceChildren();

      entries.forEach(entry => {
        const item = el('div', 'sm-favorite-item');
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

        const removeButton = el('button', 'sm-favorite-remove', {
          type: 'button',
          textContent: 'Remove'
        });
        removeButton.setAttribute(
          'aria-label',
          'Remove ' + entry.title + ' from favorites'
        );
        removeButton.addEventListener('click', () => {
          const favoriteButton = entry.card.querySelector('.sm-favorite-btn');
          if (!favoriteButton) {
            console.error('[SM] Could not find the card favorite button.');
            return;
          }
          favoriteButton.click();
        });

        item.append(button, removeButton);
        favoritesList.appendChild(item);
      });

      if (!hasFavorites && activeTab === 'favorites') {
        switchTab('style');
      }
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
      icon.classList.add('fa-solid', 'fa-heart');
      icon.setAttribute('viewBox', '0 0 512 512');
      icon.setAttribute('aria-hidden', 'true');
      // Font Awesome Free 6.7.2 heart path, CC BY 4.0: https://fontawesome.com/license/free
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      path.setAttribute(
        'd',
        'M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z'
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
        addCardInfo(card);
        addFavoriteButton(card);
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
      if (tabId === 'favorites' && favoritesTab.hidden) return;

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
      if (tabId === 'changelog') changelogTab.updateHotkey();
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
