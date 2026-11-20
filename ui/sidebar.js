
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
        { id: 'client', label: 'Client' },
        { id: 'hotkeys', label: 'Hotkeys' },
        { id: 'screenshots', label: 'Screenshots' }
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

    sidebar.appendChild(
      el('div', 'sm-sidebar-version', {
        textContent: 'v' + version
      })
    );

    return sidebar;
  };

  window.SM.NAV_GROUPS = NAV_GROUPS;
})();
