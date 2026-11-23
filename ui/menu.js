
(function () {
  const el = window.SM.el;

  const VERSION = chrome.runtime.getManifest().version;

  window.SM.createMenu = function (cardInfo = {}) {
    const overlay = el('div', 'sm-root sm-overlay');
    const win = el('div', 'sm-window');

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

    const topbar = window.SM.buildTopbar({ onClose: hide });
    win.appendChild(topbar);

    const searchSlot = topbar.querySelector('.sm-topbar-right');
    const closeBtn = searchSlot.querySelector('.sm-close');

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

    searchSlot.insertBefore(search.root, closeBtn);

    const main = el('div', 'sm-main');

    const sidebar = window.SM.buildSidebar({
      active: activeTab,
      version: VERSION,
      onSelect: switchTab
    });

    main.appendChild(sidebar);

    const content = el('div', 'sm-content');

    const styleTab = window.SM.buildStyleTab({
      initialCss: window.SM.storage.loadCss(),
      initialSettings: window.SM.storage.loadStyleSettings(),
      tabId: 'style',
      tabLabel: 'Style'
    });

    content.appendChild(styleTab.root);

    const pluginsTab = el('div', 'sm-tab-content');
    pluginsTab.id = 'tab-plugins';

    content.appendChild(pluginsTab);

    const clientTab = window.SM.buildClientTab({
      initialBackgroundSettings: backgroundSettings,
      onBackgroundChange: setBackground
    });
    content.appendChild(clientTab.root);

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

    function updateCardInfo() {
      overlay.querySelectorAll('.sm-card').forEach(addCardInfo);
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
