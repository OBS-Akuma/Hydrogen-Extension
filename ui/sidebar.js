
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
        { id: 'style', label: 'Style', icon: 'paint' }
      ]
    },
    {
      title: 'Plugins',
      tabs: [
        { id: 'plugins', label: 'Plugins', icon: 'puzzle' }
      ]
    },
    {
      title: 'Settings',
      tabs: [
        { id: 'client', label: 'Client', icon: 'settings' },
        { id: 'hotkeys', label: 'Hotkeys', icon: 'keyboard' }
      ]
    }
  ];

  const TAB_ICONS = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
    paint: '<path d="m14 6 4 4M3 21l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L3 21Z"/><path d="M14 4 4 14"/>',
    puzzle: '<path d="M19 13h-2a2 2 0 1 0-4 0v7H4a2 2 0 0 1-2-2v-3h2a2 2 0 1 0 0-4H2V7a2 2 0 0 1 2-2h4v2a2 2 0 1 0 4 0V5h5a2 2 0 0 1 2 2v3Z"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07-1.42 1.42M6.35 17.65l-1.42 1.42m14.14 0-1.42-1.42M6.35 6.35 4.93 4.93"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/>'
  };

  function createTabIcon(name) {
    const icon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    icon.classList.add('sm-sidebar-tab-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = TAB_ICONS[name] || '';
    return icon;
  }

  window.SM.buildSidebar = function ({
    active,
    version,
    initialLabels = true,
    onSelect,
    onLabelsChange
  }) {
    const sidebar = el('div', 'sm-sidebar');
    sidebar.classList.toggle('sm-sidebar-labels-hidden', !initialLabels);

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

    const labelToggle = el('button', 'sm-sidebar-label-toggle', {
      type: 'button',
      title: 'Show or hide sidebar labels'
    });
    labelToggle.setAttribute(
      'aria-label',
      initialLabels ? 'Hide sidebar labels' : 'Show sidebar labels'
    );
    const labelText = el('span', 'sm-sidebar-label-toggle-text', {
      textContent: 'Sidebar labels'
    });
    const labelTrack = el('span', 'sm-sidebar-label-track');
    labelTrack.appendChild(el('span', 'sm-sidebar-label-thumb'));
    labelToggle.setAttribute('aria-pressed', String(initialLabels));
    labelToggle.append(labelText, labelTrack);
    labelToggle.addEventListener('click', async () => {
      const enabled = sidebar.classList.contains('sm-sidebar-labels-hidden');
      sidebar.classList.toggle('sm-sidebar-labels-hidden', !enabled);
      labelToggle.setAttribute('aria-pressed', String(enabled));
      labelToggle.setAttribute(
        'aria-label',
        enabled ? 'Hide sidebar labels' : 'Show sidebar labels'
      );
      if (await onLabelsChange?.(enabled) === false) {
        sidebar.classList.toggle('sm-sidebar-labels-hidden', enabled);
        labelToggle.setAttribute('aria-pressed', String(!enabled));
        labelToggle.setAttribute(
          'aria-label',
          enabled ? 'Show sidebar labels' : 'Hide sidebar labels'
        );
      }
    });
    sidebar.appendChild(labelToggle);

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

    return sidebar;
  };

  window.SM.NAV_GROUPS = NAV_GROUPS;
})();
