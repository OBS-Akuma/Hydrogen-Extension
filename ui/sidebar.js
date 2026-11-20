
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
