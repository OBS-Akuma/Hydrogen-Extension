
(() => {
  const el = window.SM.el;

  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
  };

  function svgIcon(name) {
    return '<svg class="sm-svg" viewBox="0 0 24 24" aria-hidden="true">' +
      (ICON_PATHS[name] || '') +
      '</svg>';
  }

  const pluginEntries = [
  {
    id: 'custom-player-color',
    title: 'Custom Player Color',
    desc: 'Player skin colors, head color, body color, player appearance',
    label: 'Plugins',
    item: {
      tab: 'plugins',
      plugin: 'custom-player-color'
    }
  },
  {
    id: 'role-display',
    title: 'Role Display',
    desc: 'Player roles, profile role, admin, moderator, banned, user role display',
    label: 'Plugins',
    item: {
      tab: 'plugins',
      plugin: 'role-display'
    }
  },
  {
    id: 'skin-texture-downloader',
    title: 'Skin Texture Downloader',
    desc: 'Download skin textures, WEBP files, skin images, texture extractor',
    label: 'Plugins',
    item: {
        tab: 'plugins',
        plugin: 'skin-texture-downloader'
    }
  },
  {
    id: 'item-price-info',
    title: 'Item Price Info',
    desc: 'Skin prices, item values, owners, obtain method, date added, rank',
    label: 'Plugins',
    item: {
      tab: 'plugins',
      plugin: 'item-price-info'
    }
  },
  {
    id: 'example-controls',
    title: 'Example Controls',
    desc: 'Example slider, select dropdown, and text input UI controls',
    label: 'Plugins',
    item: {
      tab: 'plugins',
      plugin: 'example-controls'
    }
  },
  {
    id: 'interface-scale',
    title: 'Interface Scale',
    desc: 'Adjust the in-game interface size from 80% to 100%',
    label: 'Style',
    item: {
      tab: 'style',
      selector: '#tab-style [data-hydrogen-setting="interface-scale"]'
    }
  },
  {
    id: 'interface-opacity',
    title: 'Interface Opacity',
    desc: 'Adjust the in-game interface opacity from 0% to 100%',
    label: 'Style',
    item: {
      tab: 'style',
      selector: '#tab-style [data-hydrogen-setting="interface-opacity"]'
    }
  }
];

  function normalizeEntry(entry) {
    return {
      id: entry.id || entry.title || entry.label,
      title: entry.title || entry.label || entry.id || 'Untitled',
      desc: entry.desc || entry.description || '',
      label: entry.label || '',
      item: entry.item !== undefined ? entry.item : entry
    };
  }

  function setIndex(list) {
    const entries = Array.isArray(list) ? list : [];

    const normalized = entries.map(normalizeEntry);

    pluginEntries.forEach(plugin => {
      const exists = normalized.some(entry => entry.id === plugin.id);

      if (!exists) {
        normalized.push(plugin);
      }
    });

    window.SM.searchIndex = normalized;
  }

  window.SM.search = {
    setIndex
  };

  window.SM.searchIndex = [];

  setIndex([]);

  window.SM.buildSearch = function ({ onPick }) {
    const wrap = el('div', 'sm-search');
    const field = el('div', 'sm-search-field');

    const input = el('input', 'sm-search-input', {
      type: 'text',
      placeholder: 'Search...'
    });

    input.setAttribute('autocomplete', 'off');
    input.spellcheck = false;
    field.appendChild(input);

    const toggle = el('button', 'sm-icon-btn sm-search-toggle', {
      type: 'button',
      innerHTML: svgIcon('search'),
      title: 'Search'
    });

    const results = el('div', 'sm-search-results');

    wrap.append(field, toggle, results);

    let hits = [];
    let sel = -1;

    function markSel() {
      Array.from(results.children).forEach((child, index) => {
        child.classList.toggle('sm-active', index === sel);
      });
    }

    function clearResults() {
      hits = [];
      sel = -1;
      results.innerHTML = '';
      results.classList.remove('sm-open');
    }

    function open() {
      wrap.classList.add('sm-open');
      setTimeout(() => input.focus(), 60);
    }

    function close() {
      input.value = '';
      clearResults();
      input.blur();
      wrap.classList.remove('sm-open');
    }

    function pick(hit) {
      if (!hit) return;

      if (typeof onPick === 'function') {
        onPick(hit);
      }

      close();
    }

    function runSearch() {
      const query = input.value.trim().toLowerCase();

      results.innerHTML = '';
      hits = [];
      sel = -1;

      if (!query) {
        results.classList.remove('sm-open');
        return;
      }

      window.SM.searchIndex.forEach(entry => {
        const searchable = (
          entry.title + ' ' +
          (entry.desc || '') + ' ' +
          (entry.label || '')
        ).toLowerCase();

        if (searchable.includes(query)) {
          hits.push(entry);
        }
      });

      hits.slice(0, 8).forEach((hit, index) => {
        const row = el('div', 'sm-search-item');

        row.appendChild(
          el('span', null, {
            textContent: hit.title
          })
        );

        row.appendChild(
          el('span', 'sm-search-tab', {
            textContent: hit.label
          })
        );

        row.addEventListener('mousedown', event => {
          event.preventDefault();
          pick(hit);
        });

        row.addEventListener('mouseenter', () => {
          sel = index;
          markSel();
        });

        results.appendChild(row);
      });

      if (!hits.length) {
        results.appendChild(
          el('div', 'sm-search-empty', {
            textContent: 'No results'
          })
        );
      }

      results.classList.add('sm-open');
    }

    toggle.addEventListener('click', () => {
      if (wrap.classList.contains('sm-open') && !input.value.trim()) {
        close();
      } else {
        open();
      }
    });

    input.addEventListener('input', runSearch);

    input.addEventListener('focus', () => {
      if (input.value.trim()) runSearch();
    });

    input.addEventListener('keydown', event => {
      const shown = Math.min(hits.length, 8);

      if (event.key === 'ArrowDown' && shown) {
        event.preventDefault();
        sel = (sel + 1) % shown;
        markSel();
      } else if (event.key === 'ArrowUp' && shown) {
        event.preventDefault();
        sel = (sel - 1 + shown) % shown;
        markSel();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        pick(hits[sel >= 0 ? sel : 0]);
      } else if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    });

    document.addEventListener('mousedown', event => {
      if (!wrap.contains(event.target)) {
        clearResults();

        if (!input.value.trim()) {
          wrap.classList.remove('sm-open');
        }
      }
    });

    return {
      root: wrap,
      open,
      close
    };
  };
})();
