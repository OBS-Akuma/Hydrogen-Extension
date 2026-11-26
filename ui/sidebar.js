
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

  function checkForUpdate(promo, versionLabel, version) {
    chrome.runtime.sendMessage({ type: 'hydrogen.checkUpdate' })
      .then(result => {
        if (result?.error) {
          console.warn('[SM] Update check failed:', result.error);
          return;
        }

        if (typeof result?.wov === 'string') {
          versionLabel.textContent =
            `v${version} Works on v${result.wov} of kirka`;
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
    heart: '<path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A5.5 5.5 0 0 1 7.5 3c1.74 0 3.41.81 4.5 2.09A5.98 5.98 0 0 1 16.5 3 5.5 5.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.51L12 21.35Z"/>',
    'paint-roller': '<path d="M3 3h12v7H3zM6 10v3h10v8h4v-9a2 2 0 0 0-2-2H6Z"/><path d="M15 5h4a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-4"/>',
    plug: '<path d="M7 2v7m10-7v7M5 9h14v3a7 7 0 0 1-6 6.93V22h-4v-3.07A7 7 0 0 1 3 12V9h2Z"/>',
    gear: '<path d="m19.4 13.5 2.1 1.6-2 3.5-2.5-1a8 8 0 0 1-2 1.2l-.4 2.7h-4l-.4-2.7a8 8 0 0 1-2-1.2l-2.5 1-2-3.5 2.1-1.6a8 8 0 0 1 0-2.4L3.7 9.5l2-3.5 2.5 1a8 8 0 0 1 2-1.2l.4-2.7h4l.4 2.7a8 8 0 0 1 2 1.2l2.5-1 2 3.5-2.1 1.6a8 8 0 0 1 0 2.4ZM12 15.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/>',
    keyboard: '<path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm1 3v2h2V8H4Zm4 0v2h2V8H8Zm4 0v2h2V8h-2Zm4 0v2h2V8h-2Zm4 0v2h2V8h-2ZM4 12v2h2v-2H4Zm4 0v2h2v-2H8Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Zm-9 4v1h10v-1H7Z"/>'
  };

  function createTabIcon(name) {
    const icon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    icon.classList.add('sm-sidebar-tab-icon', 'fa-solid', 'fa-' + name);
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = TAB_ICONS[name] || '';
    return icon;
  }

  window.SM.buildSidebar = function ({
    active,
    version,
    onSelect
  }) {
    const sidebar = el('div', 'sm-sidebar');

    NAV_GROUPS.forEach(group => {
      const groupTitle = el('div', 'sm-nav-title', {
        textContent: group.title
      });
      groupTitle.dataset.sidebarLabel = 'true';
      sidebar.appendChild(groupTitle);

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
        btn.setAttribute('aria-label', tab.label);
        btn.append(
          createTabIcon(tab.icon),
          el('span', 'sm-tab-label', { textContent: tab.label })
        );
        btn.addEventListener('click', () => onSelect(tab.id));
        sidebar.appendChild(btn);
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
    checkForUpdate(promo, versionLabel, version);
    sidebar.appendChild(versionLabel);
    sidebar.appendChild(links);

    return {
      root: sidebar,
      setLabels(enabled) {
        sidebar.classList.toggle('sm-sidebar-labels-hidden', !enabled);
      }
    };
  };

  window.SM.NAV_GROUPS = NAV_GROUPS;
})();
