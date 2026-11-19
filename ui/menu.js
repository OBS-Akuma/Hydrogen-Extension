
(function () {
  const el = window.SM.el;

  const VERSION = chrome.runtime.getManifest().version;

  window.SM.createMenu = function () {
    const overlay = el('div', 'sm-root sm-overlay');
    const win = el('div', 'sm-window');

    win.style.backgroundImage = `
      linear-gradient(var(--sm-bg-tint), var(--sm-bg-tint)),
      url("${chrome.runtime.getURL('Backgrounds/Default.png')}")
    `;
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
          }

          if (!target) return;

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

    main.appendChild(content);
    win.appendChild(main);
    overlay.appendChild(win);

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
