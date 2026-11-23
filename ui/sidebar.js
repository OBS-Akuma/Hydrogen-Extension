
(function () {
  const el = window.SM.el;

  const NAV_GROUPS = [
    {
      title: 'Injectors',
      tabs: [
        { id: 'style', label: 'Style' }
      ]
    },
    {
      title: 'Plugins',
      tabs: [
        { id: 'plugins', label: 'Plugins' }
      ]
    },
    {
      title: 'Settings',
      tabs: [
        { id: 'client', label: 'Client' }
      ]
    }
  ];

  window.SM.buildSidebar = function ({ active, version, onSelect }) {
    const sidebar = el('div', 'sm-sidebar');

    NAV_GROUPS.forEach(group => {
      sidebar.appendChild(
        el('div', 'sm-nav-title', { textContent: group.title })
      );

      group.tabs.forEach(tab => {
        const btn = el(
          'button',
          'sm-tab-btn' + (tab.id === active ? ' sm-active' : ''),
          {
            type: 'button',
            textContent: tab.label
          }
        );

        btn.dataset.tab = tab.id;
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
    const externalIcon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    externalIcon.setAttribute('class', 'sm-sidebar-promo-external');
    externalIcon.setAttribute('viewBox', '0 0 24 24');
    externalIcon.setAttribute('aria-hidden', 'true');
    externalIcon.innerHTML = '<path d="M7 17 17 7M9 7h8v8"/>';
    promoAction.appendChild(externalIcon);
    promoContent.appendChild(promoAction);
    promo.appendChild(promoContent);
    sidebar.appendChild(promo);
    sidebar.appendChild(
      el('div', 'sm-sidebar-version', {
        textContent: 'v' + version + ' Works on v0.44.4 of kirka'
      })
    );
    sidebar.appendChild(links);

    return sidebar;
  };

  window.SM.NAV_GROUPS = NAV_GROUPS;
})();
