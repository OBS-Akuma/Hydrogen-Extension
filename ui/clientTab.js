  (() => {
    const el = window.SM.el;
    const FORMAT = 'Hydrogen Client Settings';
    const VERSION = 1;
    const PLUGIN_PREFIX = 'sm_plugin_';
    const BUILTIN_BACKGROUNDS = ['default', 'main', 'halloween', 'newvsoldgen', 'theykilledher', 'behind', 'ophelia', 'efk'];

    function isBackgroundData(value) {
      return typeof value === 'string' &&
        /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
    }

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
          backgrounds: window.SM.storage.loadBackgroundSettings(),
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

      const {
        css,
        style,
        position,
        plugins,
        backgrounds = { selected: 'default', custom: [] }
      } = data.settings;

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
        ) ||
        !(
          style.background_opacity === undefined ||
          /^(?:100|[0-9]{1,2})$/.test(String(style.background_opacity))
        ) ||
        !(
          style.menu_width === undefined ||
          /^(?:8[1-9][0-9]|9[0-9]{2}|1000)$/.test(
            String(style.menu_width)
          )
        ) ||
        !(
          style.menu_height === undefined ||
          /^(?:[4-9][0-9]{2}|1000)$/.test(String(style.menu_height))
        ) ||
        !(
          style.card_opacity === undefined ||
          /^(?:100|[0-9]{1,2})$/.test(String(style.card_opacity))
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

      if (
        !isRecord(backgrounds) ||
        typeof backgrounds.selected !== 'string' ||
        !Array.isArray(backgrounds.custom)
      ) {
        throw new Error('The exported background settings are invalid.');
      }

      const backgroundIds = new Set(BUILTIN_BACKGROUNDS);

      backgrounds.custom.forEach(background => {
        if (
          !isRecord(background) ||
          typeof background.id !== 'string' ||
          !/^[a-z0-9-]+$/i.test(background.id) ||
          backgroundIds.has(background.id) ||
          typeof background.name !== 'string' ||
          !background.name.trim() ||
          !isBackgroundData(background.data)
        ) {
          throw new Error('An exported custom background is invalid.');
        }

        backgroundIds.add(background.id);
      });

      if (!backgroundIds.has(backgrounds.selected)) {
        throw new Error('The selected exported background is invalid.');
      }

      Object.entries(plugins).forEach(([pluginId, settings]) => {
        if (!/^[a-z0-9][a-z0-9-]*$/i.test(pluginId) || !isRecord(settings)) {
          throw new Error('An exported plugin setting is invalid.');
        }
      });

      return { css, style, position, plugins, backgrounds };
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

    window.SM.buildClientTab = function ({
      initialBackgroundSettings,
      initialStyleSettings,
      onBackgroundChange,
      onAppearanceChange
    } = {}) {
      const root = el('div', 'sm-tab-content');
      root.id = 'tab-client';

      let styleSettings = initialStyleSettings ||
        window.SM.storage.loadStyleSettings();
      const appearanceCard = el('div', 'sm-card');
      appearanceCard.dataset.hydrogenSetting = 'ui-appearance';
      const appearanceHead = el('div', 'sm-card-head');
      appearanceHead.append(
        el('div', 'sm-card-title', { textContent: 'UI Appearance' }),
        el('div', 'sm-card-desc', {
          textContent:
            'Adjust the menu size and background and card opacity.'
        })
      );

      const backgroundOpacityInput = el(
        'input',
        'sm-client-opacity-slider sm-example-slider sm-interface-opacity-slider sm-client-background-opacity-slider',
        {
          type: 'range',
          min: '0',
          max: '100',
          step: '1',
          value: styleSettings.background_opacity
        }
      );
      backgroundOpacityInput.setAttribute(
        'aria-label',
        'Background tint opacity, default 35 percent'
      );
      backgroundOpacityInput.title = 'Default: 35%';
      const opacityValue = el('span', 'sm-client-opacity-value', {
        textContent: styleSettings.background_opacity + '%'
      });
      const opacityRow = el('label', 'sm-client-appearance-row');
      opacityRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Background Tint Opacity'
        }),
        backgroundOpacityInput,
        opacityValue
      );

      const menuWidthInput = el(
        'input',
        'sm-client-opacity-slider sm-example-slider sm-interface-scale-slider sm-client-menu-width-slider',
        {
          type: 'range',
          min: '810',
          max: '1000',
          step: '10',
          value: styleSettings.menu_width
        }
      );
      menuWidthInput.setAttribute('aria-label', 'Menu width, default 1000 pixels');
      menuWidthInput.title = 'Default: 1000px';
      const menuWidthValue = el('span', 'sm-client-opacity-value', {
        textContent: styleSettings.menu_width + 'px'
      });
      const menuWidthRow = el('label', 'sm-client-appearance-row');
      menuWidthRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Menu Width'
        }),
        menuWidthInput,
        menuWidthValue
      );

      const menuHeightInput = el(
        'input',
        'sm-client-opacity-slider sm-example-slider sm-interface-scale-slider sm-client-menu-height-slider',
        {
          type: 'range',
          min: '400',
          max: '1000',
          step: '10',
          value: styleSettings.menu_height
        }
      );
      menuHeightInput.setAttribute('aria-label', 'Menu height, default 660 pixels');
      menuHeightInput.title = 'Default: 660px';
      const menuHeightValue = el('span', 'sm-client-opacity-value', {
        textContent: styleSettings.menu_height + 'px'
      });
      const menuHeightRow = el('label', 'sm-client-appearance-row');
      menuHeightRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Menu Height'
        }),
        menuHeightInput,
        menuHeightValue
      );

      const cardOpacityInput = el(
        'input',
        'sm-client-opacity-slider sm-example-slider sm-interface-opacity-slider sm-client-card-opacity-slider',
        {
          type: 'range',
          min: '0',
          max: '100',
          step: '1',
          value: styleSettings.card_opacity
        }
      );
      cardOpacityInput.setAttribute(
        'aria-label',
        'Card opacity, default 60 percent'
      );
      cardOpacityInput.title = 'Default: 60%';
      const cardOpacityValue = el('span', 'sm-client-opacity-value', {
        textContent: styleSettings.card_opacity + '%'
      });
      const cardOpacityRow = el('label', 'sm-client-appearance-row');
      cardOpacityRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Card Opacity'
        }),
        cardOpacityInput,
        cardOpacityValue
      );

      const appearanceStatus = el('div', 'sm-plugin-status');
      appearanceStatus.setAttribute('role', 'status');
      appearanceStatus.setAttribute('aria-live', 'polite');
      appearanceCard.append(
        appearanceHead,
        opacityRow,
        menuWidthRow,
        menuHeightRow,
        cardOpacityRow,
        appearanceStatus
      );

      function syncAppearanceInputs() {
        backgroundOpacityInput.value = styleSettings.background_opacity;
        opacityValue.textContent = styleSettings.background_opacity + '%';
        menuWidthInput.value = styleSettings.menu_width;
        menuWidthValue.textContent = styleSettings.menu_width + 'px';
        menuHeightInput.value = styleSettings.menu_height;
        menuHeightValue.textContent = styleSettings.menu_height + 'px';
        cardOpacityInput.value = styleSettings.card_opacity;
        cardOpacityValue.textContent = styleSettings.card_opacity + '%';
        updateDefaultStopHighlights();
      }

      function updateDefaultStopHighlights() {
        backgroundOpacityInput.classList.toggle(
          'sm-at-stop',
          Number(backgroundOpacityInput.value) === 35
        );
        cardOpacityInput.classList.toggle(
          'sm-at-stop',
          Number(cardOpacityInput.value) === 60
        );
        menuWidthInput.classList.toggle(
          'sm-at-stop',
          Number(menuWidthInput.value) === 1000
        );
        menuHeightInput.classList.toggle(
          'sm-at-stop',
          Number(menuHeightInput.value) === 660
        );
      }

      function getAppearanceSettings() {
        return {
          ...window.SM.storage.loadStyleSettings(),
          background_opacity: backgroundOpacityInput.value,
          menu_width: menuWidthInput.value,
          menu_height: menuHeightInput.value,
          card_opacity: cardOpacityInput.value
        };
      }

      function previewAppearance() {
        opacityValue.textContent = backgroundOpacityInput.value + '%';
        menuWidthValue.textContent = menuWidthInput.value + 'px';
        menuHeightValue.textContent = menuHeightInput.value + 'px';
        cardOpacityValue.textContent = cardOpacityInput.value + '%';
        updateDefaultStopHighlights();
        onAppearanceChange?.(getAppearanceSettings());
      }

      async function saveAppearance() {
        const currentSettings = window.SM.storage.loadStyleSettings();
        const nextSettings = getAppearanceSettings();

        if (!await window.SM.storage.saveStyleSettings(nextSettings)) {
          styleSettings = currentSettings;
          syncAppearanceInputs();
          onAppearanceChange?.(styleSettings);
          appearanceStatus.textContent =
            'Could not save appearance settings. Check available browser storage.';
          return;
        }

        styleSettings = window.SM.storage.loadStyleSettings();
        syncAppearanceInputs();
        onAppearanceChange?.(styleSettings);
        appearanceStatus.textContent = 'Appearance saved.';
      }

      updateDefaultStopHighlights();
      backgroundOpacityInput.addEventListener('input', previewAppearance);
      backgroundOpacityInput.addEventListener('change', saveAppearance);
      menuWidthInput.addEventListener('input', previewAppearance);
      menuWidthInput.addEventListener('change', saveAppearance);
      menuHeightInput.addEventListener('input', previewAppearance);
      menuHeightInput.addEventListener('change', saveAppearance);
      cardOpacityInput.addEventListener('input', previewAppearance);
      cardOpacityInput.addEventListener('change', saveAppearance);

      const backgrounds = el('div', 'sm-card');
      const backgroundsHead = el('div', 'sm-card-head');
      backgroundsHead.append(
        el('div', 'sm-card-title', { textContent: 'Background' }),
        el('div', 'sm-card-desc', {
          textContent: 'Choose a built-in background or upload your own image. You can upload PNG, JPEG/JPG, WebP, or GIF (some may not work)'
        })
      );

      let backgroundSettings = initialBackgroundSettings ||
        window.SM.storage.loadBackgroundSettings();
      const backgroundSelect = el('select', 'sm-css-url-input');
      backgroundSelect.setAttribute('aria-label', 'Client background');
      const backgroundInput = el('input', 'sm-css-file-input', {
        type: 'file',
        accept: 'image/png,image/jpeg,image/webp,image/gif',
        multiple: true
      });
      backgroundInput.setAttribute('aria-label', 'Upload background images');

      const removeBackgroundButton = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Remove selected upload'
      });
      removeBackgroundButton.hidden = true;

      const backgroundStatus = el('div', 'sm-plugin-status');
      backgroundStatus.setAttribute('role', 'status');
      backgroundStatus.setAttribute('aria-live', 'polite');

      function backgroundUrl(settings) {
        const selectedCustom = settings.custom.find(
          background => background.id === settings.selected
        );

        if (selectedCustom) return selectedCustom.data;

        const paths = {
          default: 'Backgrounds/Default.png',
          main: 'Backgrounds/main.png',
          halloween: 'Backgrounds/halloween.webp',
          newvsoldgen: 'Backgrounds/nvo.webp',
          theykilledher: 'Backgrounds/Tkh.webp',
          behind: 'Backgrounds/Gtmts.webp',
          ophelia: 'Backgrounds/Os.webp',
          efk: 'Backgrounds/efk.webp'
        };

        return chrome.runtime.getURL(paths[settings.selected] || paths.default);
      }

      function renderBackgroundOptions() {
        backgroundSelect.replaceChildren();

        [
          ['default', 'Default'],
          ['main', 'Main'],
          ['halloween', 'Halloween'],
          ['newvsoldgen', 'New VS Oldgen'],
          ['theykilledher', 'They killed her'],
          ['behind', 'Behind'],
          ['ophelia', 'Ophelia'],
          ['efk', 'Efk']
        ].forEach(([id, label]) => {
          backgroundSelect.appendChild(el('option', null, {
            value: id,
            textContent: label
          }));
        });

        backgroundSettings.custom.forEach(background => {
          backgroundSelect.appendChild(el('option', null, {
            value: background.id,
            textContent: background.name
          }));
        });

        backgroundSelect.value = backgroundSettings.selected;
        removeBackgroundButton.hidden = !backgroundSettings.custom.some(
          background => background.id === backgroundSettings.selected
        );
      }

      async function saveBackgroundSettings(nextSettings, message) {
        if (!await window.SM.storage.saveBackgroundSettings(nextSettings)) {
          backgroundStatus.textContent =
            'Could not save background settings. Check available browser storage.';
          renderBackgroundOptions();
          return false;
        }

        backgroundSettings = nextSettings;
        onBackgroundChange?.(backgroundUrl(backgroundSettings));
        backgroundStatus.textContent = message;
        renderBackgroundOptions();
        return true;
      }

      function readImageAsDataUrl(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (!isBackgroundData(reader.result)) {
              reject(new Error('Unsupported image format.'));
              return;
            }

            resolve(reader.result);
          };
          reader.onerror = () => {
            reject(reader.error || new Error('Could not read the image file.'));
          };
          reader.readAsDataURL(file);
        });
      }

      backgroundSelect.addEventListener('change', async () => {
        await saveBackgroundSettings({
          ...backgroundSettings,
          selected: backgroundSelect.value
        }, 'Background saved.');
      });

      backgroundInput.addEventListener('change', async () => {
        const files = Array.from(backgroundInput.files || []);
        const additions = [];
        const errors = [];

        for (const file of files) {
          try {
            const data = await readImageAsDataUrl(file);
            let id;

            do {
              id = 'custom-' + Date.now().toString(36) +
                '-' + Math.random().toString(36).slice(2);
            } while (backgroundSettings.custom.some(item => item.id === id) ||
              additions.some(item => item.id === id));

            additions.push({ id, name: file.name, data });
          } catch (error) {
            errors.push(file.name + ': ' + error.message);
          }
        }

        backgroundInput.value = '';

        if (!additions.length) {
          if (errors.length) {
            backgroundStatus.textContent = 'Upload failed: ' + errors.join('; ');
          }
          return;
        }

        const nextSettings = {
          custom: backgroundSettings.custom.concat(additions),
          selected: additions[additions.length - 1].id
        };
        const saved = await saveBackgroundSettings(
          nextSettings,
          errors.length
            ? 'Backgrounds saved. Some files failed: ' + errors.join('; ')
            : 'Background uploaded and saved.'
        );

        if (!saved && errors.length) {
          backgroundStatus.textContent += ' Upload errors: ' + errors.join('; ');
        }
      });

      removeBackgroundButton.addEventListener('click', async () => {
        const nextSettings = {
          custom: backgroundSettings.custom.filter(
            background => background.id !== backgroundSettings.selected
          ),
          selected: 'default'
        };

        await saveBackgroundSettings(
          nextSettings,
          'Uploaded background removed.'
        );
      });

      renderBackgroundOptions();
      backgrounds.append(
        backgroundsHead,
        backgroundSelect,
        backgroundInput,
        removeBackgroundButton,
        backgroundStatus
      );

      const resetCard = el('div', 'sm-card');
      const resetHead = el('div', 'sm-card-head');
      resetHead.append(
        el('div', 'sm-card-title', { textContent: 'Reset Settings' }),
        el('div', 'sm-card-desc', {
          textContent:
            'Clear Hydrogen settings and turn off all plugins. This cannot be undone.'
        })
      );

      const resetButton = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Reset to Defaults'
      });
      resetCard.append(resetHead, resetButton);

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
      importInput.setAttribute('aria-label', 'Import settings JSON file');

      const importOr = el('div', 'sm-client-import-or', {
        textContent: 'Or paste exported settings JSON'
      });

      const importText = el('textarea', 'sm-textarea sm-client-import-text', {
        placeholder: 'Paste your exported Hydrogen settings JSON here...',
        spellcheck: false
      });
      importText.setAttribute('aria-label', 'Paste settings JSON');

      const importTextButton = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Import Pasted Settings'
      });
      importCard.append(importHead, importInput, importOr, importText, importTextButton);

      const status = el('div', 'sm-plugin-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');

      const reloadButton = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Reload page to apply'
      });
      reloadButton.hidden = true;
      root.append(
        appearanceCard,
        backgrounds,
        resetCard,
        exportCard,
        importCard,
        status,
        reloadButton
      );

      resetButton.addEventListener('click', async () => {
        if (!window.confirm('Reset all Hydrogen settings and turn off every plugin?')) {
          return;
        }

        resetButton.disabled = true;
        status.textContent = 'Resetting settings...';

        try {
          if (!window.SM.storage.saveCss('')) {
            throw new Error('Could not clear the custom CSS.');
          }

          if (!window.SM.storage.savePos(40, 40)) {
            throw new Error('Could not reset the menu position.');
          }

          if (!await window.SM.storage.saveStyleSettings({
            cssUrl: '',
            files: [],
            interface_bounds: '',
            interface_opacity: '',
            background_opacity: '35',
            menu_width: '1000',
            menu_height: '660',
            card_opacity: '60'
          })) {
            throw new Error('Could not reset the Style tab settings.');
          }

          const defaultBackgroundSettings = {
            selected: 'default',
            custom: []
          };
          if (!await window.SM.storage.saveBackgroundSettings(
            defaultBackgroundSettings
          )) {
            throw new Error('Could not reset the background settings.');
          }

          getPluginKeys().forEach(key => localStorage.removeItem(key));

          backgroundSettings = defaultBackgroundSettings;
          styleSettings = window.SM.storage.loadStyleSettings();
          syncAppearanceInputs();
          onBackgroundChange?.(backgroundUrl(backgroundSettings));
          onAppearanceChange?.(styleSettings);
          renderBackgroundOptions();
          status.textContent =
            'Settings reset. All plugins are off. Reload the page to apply.';
          reloadButton.hidden = false;
        } catch (error) {
          console.error('[Client Settings] Reset failed:', error);
          status.textContent = 'Reset failed: ' + error.message;
        } finally {
          resetButton.disabled = false;
        }
      });

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

      async function importSettings(readText) {
        status.textContent = 'Importing settings...';

        try {
          const data = validateImportData(JSON.parse(await readText()));
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

          styleSettings = window.SM.storage.loadStyleSettings();
          syncAppearanceInputs();
          onAppearanceChange?.(styleSettings);

          if (!await window.SM.storage.saveBackgroundSettings(data.backgrounds)) {
            throw new Error('Could not save the background settings.');
          }

          backgroundSettings = data.backgrounds;
          onBackgroundChange?.(backgroundUrl(backgroundSettings));
          renderBackgroundOptions();

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
          return true;
        } catch (error) {
          console.error('[Client Settings] Import failed:', error);
          status.textContent = 'Import failed: ' + error.message;
          return false;
        }
      }

      importInput.addEventListener('change', async () => {
        const file = importInput.files && importInput.files[0];
        if (!file) return;

        await importSettings(() => file.text());
        importInput.value = '';
      });

      importTextButton.addEventListener('click', async () => {
        if (await importSettings(() => importText.value)) {
          importText.value = '';
        }
      });

      reloadButton.addEventListener('click', () => {
        window.location.reload();
      });

      window.SM.searchIndex.push({
        id: 'client-settings',
        label: 'Settings',
        title: 'Client Settings',
        desc: 'Import or export Hydrogen settings, change menu size and opacity',
        item: {
          tab: 'client',
          selector: '#tab-client'
        }
      });

      window.SM.searchIndex.push({
        id: 'ui-appearance',
        label: 'Settings',
        title: 'UI Appearance',
        desc: 'Change the menu size and opacity',
        item: {
          tab: 'client',
          selector: '#tab-client [data-hydrogen-setting="ui-appearance"]'
        }
      });

      return { root };
    };
  })();
