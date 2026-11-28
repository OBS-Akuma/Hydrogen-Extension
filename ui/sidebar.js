
(function () {
  const el = window.SM.el;

  function createExternalIcon() {
    const icon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    icon.setAttribute('class', 'sm-sidebar-promo-external');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<path d="M7 17 17 7M9 7h8v8"/>';
    return icon;
  }

  function createUpdateLink(className, actionClass) {
    const updateLink = el('a', className, {
      href: 'chrome://extensions',
      title: 'Open Chrome Extensions to update Hydrogen'
    });
    updateLink.setAttribute('aria-label', 'Update Available');

    const updateAction = el('span', actionClass);
    updateAction.appendChild(document.createTextNode('Update Available'));
    updateAction.appendChild(createExternalIcon());
    updateLink.appendChild(updateAction);
    updateLink.addEventListener('click', event => {
      event.preventDefault();
      chrome.runtime.sendMessage({ type: 'hydrogen.openExtensions' })
        .then(openResult => {
          if (openResult?.error) {
            console.error(
              '[SM] Could not open the extensions page:',
              openResult.error
            );
          }
        })
        .catch(error => {
          console.error('[SM] Could not open the extensions page:', error);
        });
    });

    return updateLink;
  }

  function checkForUpdate(
    versionLabel,
    version,
    versionTarget,
    topbarUpdateSlot
  ) {
    chrome.runtime.sendMessage({ type: 'hydrogen.checkUpdate' })
      .then(result => {
        if (result?.error) {
          console.warn('[SM] Update check failed:', result.error);
          return;
        }

        if (typeof result?.wov === 'string') {
          const text = `v${version} Works on v${result.wov} of kirka`;
          versionLabel.textContent = text;
          versionTarget.textContent = text;
        }

        if (!result?.available) return;

        topbarUpdateSlot.appendChild(
          createUpdateLink('sm-topbar-update', 'sm-topbar-update-action')
        );
      })
      .catch(error => {
        console.warn('[SM] Update check failed:', error);
      });
  }

  const NAV_GROUPS = [
    {
      title: 'Getting Started',
      tabs: [
        { id: 'changelog', label: 'Changelog', icon: 'house' }
      ]
    },
    {
      title: 'Favorites',
      tabs: [
        { id: 'favorites', label: 'Favorites', icon: 'heart' }
      ]
    },
    {
      title: 'Injectors',
      tabs: [
        { id: 'style', label: 'Style', icon: 'paint-roller' },
        { id: 'themes', label: 'Theme Library', icon: 'wand-magic-sparkles' }
      ]
    },
    {
      title: 'Plugins',
      tabs: [
        { id: 'plugins', label: 'Plugins', icon: 'plug' }
      ]
    },
    {
      title: 'Settings',
      tabs: [
        { id: 'client', label: 'Client', icon: 'gear' },
        { id: 'hotkeys', label: 'Hotkeys', icon: 'keyboard' }
      ]
    }
  ];

  const TAB_ICON_NAMES = new Set([
    'house',
    'pen-to-square',
    'heart',
    'paint-roller',
    'wand-magic-sparkles',
    'plug',
    'gear',
    'keyboard'
  ]);

  function createTabIcon(name) {
    const icon = el('i', 'sm-sidebar-tab-icon fa-solid fa-' + name);
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  window.SM.buildSidebar = function ({
    active,
    version,
    versionTarget,
    topbarUpdateSlot,
    onSelect
  }) {
    const sidebar = el('div', 'sm-sidebar');
    const nav = el('div', 'sm-sidebar-nav');
    const tabButtons = new Map();
    const tabGroups = new Map();

    NAV_GROUPS.forEach(group => {
      const groupTitle = el('div', 'sm-nav-title', {
        textContent: group.title
      });
      groupTitle.dataset.sidebarLabel = 'true';
      nav.appendChild(groupTitle);
      const groupTabs = [];

      group.tabs.forEach(tab => {
        const btn = el(
          'button',
          'sm-tab-btn' + (tab.id === active ? ' sm-active' : ''),
          {
            type: 'button',
            title: tab.label
          }
        );

        btn.dataset.tab = tab.id;
        tabButtons.set(tab.id, btn);
        groupTabs.push(btn);
        btn.setAttribute('aria-label', tab.label);
        btn.append(
          createTabIcon(tab.icon),
          el('span', 'sm-tab-label', { textContent: tab.label })
        );
        btn.addEventListener('click', () => onSelect(tab.id));
        nav.appendChild(btn);
      });

      tabGroups.set(group.title, {
        title: groupTitle,
        buttons: groupTabs
      });
    });

    sidebar.appendChild(nav);

    const links = el('div', 'sm-sidebar-links');
    [
      {
        href: 'https://www.yxzoi.xyz/Hydrogen',
        image: 'icon/H1K.png',
        label: 'Visit H1K'
      },
      {
        href: 'https://kirkacommunityhub.pages.dev/',
        image: 'icon/KA.png',
        label: 'Visit Kirka Community Hub'
      },
      {
        href: 'https://ktiers.com/',
        image: 'icon/ktiersIcon.png',
        label: 'Kirka Competitive League'
      },
      {
        href: 'https://smudgy.store/',
        image: 'icon/smudgy.png',
        label: 'Multipurpose Kirka website with various tools.'
      }
    ].forEach(link => {
      const anchor = el('a', 'sm-sidebar-link', {
        href: link.href,
        target: '_blank',
        rel: 'noopener noreferrer'
      });
      anchor.setAttribute('aria-label', link.label);
      anchor.title = link.label;
      anchor.appendChild(el('img', 'sm-sidebar-link-image', {
        src: chrome.runtime.getURL(link.image),
        alt: ''
      }));
      links.appendChild(anchor);
    });
    const promo = el('a', 'sm-sidebar-promo', {
      href: 'https://www.youtube.com/watch?v=4teeymVuHTw',
      target: '_blank',
      rel: 'noopener noreferrer',
      title: 'Watch the Hydrogen Extension promotional video'
    });
    promo.setAttribute('aria-label', 'Watch the Hydrogen Extension promotional video');
    promo.style.backgroundImage =
      'linear-gradient(180deg, rgba(8, 12, 24, 0.08), rgba(8, 12, 24, 0.72)), ' +
      `url("${chrome.runtime.getURL('Backgrounds/main.png')}")`;
    const logo = el('img', 'sm-sidebar-promo-logo', {
      src: chrome.runtime.getURL('icon/HYD.png'),
      alt: ''
    });
    logo.draggable = false;
    promo.appendChild(logo);

    const promoContent = el('div', 'sm-sidebar-promo-content');
    promoContent.appendChild(el('span', 'sm-sidebar-promo-label', {
      textContent: 'Hydrogen Extension'
    }));

    const promoAction = el('span', 'sm-sidebar-promo-action');
    promoAction.appendChild(document.createTextNode('Watch the Promo'));
    promoAction.appendChild(createExternalIcon());
    promoContent.appendChild(promoAction);
    promo.appendChild(promoContent);
    sidebar.appendChild(promo);
    const versionLabel = el('div', 'sm-sidebar-version', {
      textContent: 'v' + version + ' Works on v0.44.4 of kirka'
    });
    versionTarget.textContent = versionLabel.textContent;
    checkForUpdate(
      versionLabel,
      version,
      versionTarget,
      topbarUpdateSlot
    );
    sidebar.appendChild(versionLabel);
    sidebar.appendChild(links);

    return {
      root: sidebar,
      setLabels(enabled) {
        sidebar.classList.toggle('sm-sidebar-labels-hidden', !enabled);
        versionLabel.hidden = !enabled;
        versionTarget.hidden = enabled;
      },
      setIcons(enabled) {
        sidebar.classList.toggle('sm-sidebar-icons-hidden', !enabled);
      },
      setTabLabel(tabId, label) {
        const button = tabButtons.get(tabId);
        const text = button?.querySelector('.sm-tab-label');
        if (!button || !text) {
          throw new Error('Unknown sidebar tab: ' + tabId);
        }

        text.textContent = label;
        button.title = label;
        button.setAttribute('aria-label', label);
      },
      setTabIcon(tabId, iconName) {
        const button = tabButtons.get(tabId);
        const icon = button?.querySelector('.sm-sidebar-tab-icon');
        if (!button || !icon || !TAB_ICON_NAMES.has(iconName)) {
          throw new Error('Unknown sidebar tab icon: ' + iconName);
        }

        Array.from(icon.classList)
          .filter(className =>
            className.startsWith('fa-') && className !== 'fa-solid'
          )
          .forEach(className => icon.classList.remove(className));
        icon.classList.add('fa-' + iconName);
      },
      setTabGroupTitleVisible(tabId, visible) {
        const button = tabButtons.get(tabId);
        const group = Array.from(tabGroups.values()).find(({ buttons }) =>
          buttons.includes(button)
        );
        if (!button || !group) {
          throw new Error('Unknown sidebar tab: ' + tabId);
        }

        group.title.hidden = !visible || group.buttons.every(
          tabButton => tabButton.hidden
        );
      },
      setTabVisible(tabId, visible) {
        const button = tabButtons.get(tabId);
        const group = Array.from(tabGroups.values()).find(({ buttons }) =>
          buttons.includes(button)
        );
        if (!button || !group) {
          throw new Error('Unknown sidebar tab: ' + tabId);
        }

        button.hidden = !visible;
        group.title.hidden = group.buttons.every(tabButton => tabButton.hidden);
      }
    };
  };

  window.SM.NAV_GROUPS = NAV_GROUPS;
})();
