(() => {
  const el = window.SM.el;
  const FORMAT = 'Hydrogen Client Settings';
  const VERSION = 1;
  const PLUGIN_PREFIX = 'sm_plugin_';

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function readPluginSettings() {
    const plugins = {};

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);

      if (!key || !key.startsWith(PLUGIN_PREFIX)) continue;

      const pluginId = key.slice(PLUGIN_PREFIX.length);

      if (!/^[a-z0-9][a-z0-9-]*$/i.test(pluginId)) {
        throw new Error('Invalid Hydrogen plugin settings key: ' + key);
      }

      let settings;

      try {
        settings = JSON.parse(localStorage.getItem(key));
      } catch (error) {
        throw new Error(
          'Could not read settings for plugin "' + pluginId + '": ' +
          error.message
        );
      }

      if (!isRecord(settings)) {
        throw new Error(
          'Settings for plugin "' + pluginId + '" are not an object.'
        );
      }

      plugins[pluginId] = settings;
    }

    return plugins;
  }

  function createExportData() {
    return {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      settings: {
        css: window.SM.storage.loadCss(),
        style: window.SM.storage.loadStyleSettings(),
        position: window.SM.storage.loadPos() || { x: 40, y: 40 },
        plugins: readPluginSettings()
      }
    };
  }

  function validateImportData(data) {
    if (
      !isRecord(data) ||
      data.format !== FORMAT ||
      data.version !== VERSION ||
      !isRecord(data.settings)
    ) {
      throw new Error('This is not a supported Hydrogen settings file.');
    }

    const { css, style, position, plugins } = data.settings;

    if (typeof css !== 'string') {
      throw new Error('The exported CSS setting is invalid.');
    }

    if (
      !isRecord(style) ||
      typeof style.cssUrl !== 'string' ||
      !Array.isArray(style.files) ||
      !(
        style.interface_bounds === '' ||
        style.interface_bounds === '0' ||
        style.interface_bounds === '1' ||
        /^(?:100|(?:8[0-9]|9[0-9]))$/.test(style.interface_bounds)
      ) ||
      !(
        style.interface_opacity === '' ||
        /^(?:100|[0-9]{1,2})$/.test(style.interface_opacity)
      )
    ) {
      throw new Error('The exported Style tab settings are invalid.');
    }

    const fileNames = new Set();

    style.files.forEach(file => {
      if (
        !isRecord(file) ||
        typeof file.name !== 'string' ||
        !file.name ||
        fileNames.has(file.name) ||
        typeof file.css !== 'string' ||
        !Number.isFinite(file.size) ||
        file.size < 0 ||
        typeof file.enabled !== 'boolean'
      ) {
        throw new Error('An uploaded CSS file entry is invalid.');
      }

      fileNames.add(file.name);
    });

    if (
      !isRecord(position) ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      throw new Error('The exported menu position is invalid.');
    }

    if (!isRecord(plugins)) {
      throw new Error('The exported plugin settings are invalid.');
    }

    Object.entries(plugins).forEach(([pluginId, settings]) => {
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(pluginId) || !isRecord(settings)) {
        throw new Error('An exported plugin setting is invalid.');
      }
    });

    return { css, style, position, plugins };
  }

  function getPluginKeys() {
    const keys = [];

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);

      if (key && key.startsWith(PLUGIN_PREFIX)) {
        keys.push(key);
      }
    }

    return keys;
  }

  window.SM.buildClientTab = function () {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-client';

    const exportCard = el('div', 'sm-card');
    const exportHead = el('div', 'sm-card-head');
    exportHead.append(
      el('div', 'sm-card-title', { textContent: 'Export Settings' }),
      el('div', 'sm-card-desc', {
        textContent: 'Download your Hydrogen client settings as a JSON file.'
      })
    );

    const exportButton = el('button', 'sm-plugin-button', {
      type: 'button',
      textContent: 'Export Settings'
    });
    exportCard.append(exportHead, exportButton);

    const importCard = el('div', 'sm-card');
    const importHead = el('div', 'sm-card-head');
    importHead.append(
      el('div', 'sm-card-title', { textContent: 'Import Settings' }),
      el('div', 'sm-card-desc', {
        textContent:
          'Choose a Hydrogen JSON file. Importing replaces your current Hydrogen settings.'
      })
    );

    const importInput = el('input', 'sm-css-file-input', {
      type: 'file',
      accept: '.json,application/json'
    });
    importCard.append(importHead, importInput);

    const status = el('div', 'sm-plugin-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const reloadButton = el('button', 'sm-plugin-button', {
      type: 'button',
      textContent: 'Reload page to apply'
    });
    reloadButton.hidden = true;
    root.append(exportCard, importCard, status, reloadButton);

    exportButton.addEventListener('click', () => {
      try {
        const data = createExportData();
        const blob = new Blob(
          [JSON.stringify(data, null, 2)],
          { type: 'application/json' }
        );
        const downloadUrl = URL.createObjectURL(blob);
        const link = el('a', null, {
          href: downloadUrl,
          download: 'hydrogen-client-settings.json'
        });

        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        status.textContent = 'Settings exported.';
      } catch (error) {
        console.error('[Client Settings] Export failed:', error);
        status.textContent = 'Export failed: ' + error.message;
      }
    });

    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;

      status.textContent = 'Importing settings...';

      try {
        const data = validateImportData(JSON.parse(await file.text()));
        const oldPluginKeys = getPluginKeys();

        if (!window.SM.storage.saveCss(data.css)) {
          throw new Error('Could not save the custom CSS.');
        }

        if (!window.SM.storage.savePos(data.position.x, data.position.y)) {
          throw new Error('Could not save the menu position.');
        }

        if (!await window.SM.storage.saveStyleSettings(data.style)) {
          throw new Error('Could not save the Style tab settings.');
        }

        const importedPluginKeys = new Set(
          Object.keys(data.plugins).map(id => PLUGIN_PREFIX + id)
        );

        oldPluginKeys.forEach(key => {
          if (!importedPluginKeys.has(key)) {
            localStorage.removeItem(key);
          }
        });

        Object.entries(data.plugins).forEach(([pluginId, settings]) => {
          localStorage.setItem(
            PLUGIN_PREFIX + pluginId,
            JSON.stringify(settings)
          );
        });

        status.textContent =
          'Settings imported. Reload the page to apply all imported settings.';
        reloadButton.hidden = false;
      } catch (error) {
        console.error('[Client Settings] Import failed:', error);
        status.textContent = 'Import failed: ' + error.message;
      } finally {
        importInput.value = '';
      }
    });

    reloadButton.addEventListener('click', () => {
      window.location.reload();
    });

    window.SM.searchIndex.push({
      id: 'client-settings',
      label: 'Settings',
      title: 'Client Settings',
      desc: 'Import or export Hydrogen client settings',
      item: {
        tab: 'client',
        selector: '#tab-client'
      }
    });

    return { root };
  };
})();
