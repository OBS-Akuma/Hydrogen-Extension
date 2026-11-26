
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

  function checkForUpdate(promo, versionLabel, version, versionTarget) {
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

        const updateLink = el('a', 'sm-sidebar-update', {
          href: 'chrome://extensions',
          title: 'Open Chrome Extensions to update Hydrogen'
        });
        updateLink.setAttribute('aria-label', 'Update Available');

        const updateAction = el('span', 'sm-sidebar-promo-action');
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

        promo.insertAdjacentElement('afterend', updateLink);
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
        { id: 'style', label: 'Style', icon: 'paint-roller' }
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

  const TAB_ICONS = {
    // Font Awesome Free 6.7.2 by Fonticons, Inc.; CC BY 4.0:
    // https://fontawesome.com/license/free
    house: 'M12 2.5 1 11.7h3V21h6v-6h4v6h6v-9.3h3L12 2.5z',
    'pen-to-square': 'M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.8l86.1 86.1 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2l-6.9-6.9zM107.5 350.3c-4.4 4.4-7.2 10.1-8.2 16.3l-10.5 63.2c-1.2 7.2 5.1 13.4 12.3 12.3l63.1-10.5c6.2-1 11.9-3.8 16.3-8.2L436.1 168.1 350 82 107.5 350.3zM64 64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V288c0-17.7-14.3-32-32-32s-32 14.3-32 32V448H64V128H224c17.7 0 32-14.3 32-32s-14.3-32-32-32H64z',
    heart: 'M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z',
    'paint-roller': 'M0 64C0 28.7 28.7 0 64 0L352 0c35.3 0 64 28.7 64 64l0 64c0 35.3-28.7 64-64 64L64 192c-35.3 0-64-28.7-64-64L0 64zM160 352c0-17.7 14.3-32 32-32l0-16c0-44.2 35.8-80 80-80l144 0c17.7 0 32-14.3 32-32l0-32 0-90.5c37.3 13.2 64 48.7 64 90.5l0 32c0 53-43 96-96 96l-144 0c-8.8 0-16 7.2-16 16l0 16c17.7 0 32 14.3 32 32l0 128c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32l0-128z',
    plug: 'M96 0C78.3 0 64 14.3 64 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM288 0c-17.7 0-32 14.3-32 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l0 32c0 77.4 55 142 128 156.8l0 67.2c0 17.7 14.3 32 32 32s32-14.3 32-32l0-67.2C297 398 352 333.4 352 256l0-32c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160z',
    gear: 'M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6-.3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c13.4 10.3 28.2 18.9 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z',
    keyboard: 'M64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l448 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L64 64zm16 64l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM64 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zm80-176c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zM160 336c0-8.8 7.2-16 16-16l224 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-224 0c-8.8 0-16-7.2-16-16l0-32zM272 128l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM256 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zM368 128l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM352 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zM464 128l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32c0-8.8 7.2-16 16-16zM448 240c0-8.8 7.2-16 16-16l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32zm16 80l32 0c8.8 0 16 7.2 16 16l0 32c0 8.8-7.2 16-16 16l-32 0c-8.8 0-16-7.2-16-16l0-32z'
  };

  const TAB_ICON_VIEWBOXES = {
    house: '0 0 24 24',
    'pen-to-square': '0 0 512 512',
    heart: '0 0 512 512',
    'paint-roller': '0 0 512 512',
    plug: '0 0 384 512',
    gear: '0 0 512 512',
    keyboard: '0 0 576 512'
  };

  function createTabIcon(name) {
    const icon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    icon.classList.add('sm-sidebar-tab-icon', 'fa-solid', 'fa-' + name);
    icon.setAttribute('viewBox', TAB_ICON_VIEWBOXES[name] || '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.icon = name;
    icon.innerHTML = '<path d="' + (TAB_ICONS[name] || '') + '"/>';
    return icon;
  }

  window.SM.buildSidebar = function ({
    active,
    version,
    versionTarget,
    onSelect
  }) {
    const sidebar = el('div', 'sm-sidebar');
    const tabButtons = new Map();
    const tabGroups = new Map();

    NAV_GROUPS.forEach(group => {
      const groupTitle = el('div', 'sm-nav-title', {
        textContent: group.title
      });
      groupTitle.dataset.sidebarLabel = 'true';
      sidebar.appendChild(groupTitle);
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
        sidebar.appendChild(btn);
      });

      tabGroups.set(group.title, {
        title: groupTitle,
        buttons: groupTabs
      });
    });

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
    checkForUpdate(promo, versionLabel, version, versionTarget);
    sidebar.appendChild(versionLabel);
    sidebar.appendChild(links);

    return {
      root: sidebar,
      setLabels(enabled) {
        sidebar.classList.toggle('sm-sidebar-labels-hidden', !enabled);
        versionLabel.hidden = !enabled;
        versionTarget.hidden = enabled;
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
        const path = icon?.querySelector('path');
        if (!button || !icon || !path || !TAB_ICONS[iconName]) {
          throw new Error('Unknown sidebar tab icon: ' + iconName);
        }

        icon.classList.remove('fa-' + icon.dataset.icon);
        icon.classList.add('fa-' + iconName);
        icon.dataset.icon = iconName;
        icon.setAttribute('viewBox', TAB_ICON_VIEWBOXES[iconName] || '0 0 24 24');
        path.setAttribute('d', TAB_ICONS[iconName]);
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
