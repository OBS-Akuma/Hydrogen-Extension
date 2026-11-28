  (() => {
    const el = window.SM.el;
    const FORMAT = 'Hydrogen Client Settings';
    const VERSION = 1;
    const PLUGIN_PREFIX = 'sm_plugin_';
    const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
    const BUILTIN_BACKGROUNDS = ['default', 'main', 'halloween', 'newvsoldgen', 'theykilledher', 'behind', 'ophelia', 'efk', 'juice'];

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
          plugins: readPluginSettings(),
          favorites: window.SM.storage.loadFavorites(),
          hotkey: window.SM.storage.loadHotkey()
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
        favorites = [],
        hotkey = {
          code: 'ShiftRight',
          ctrl: false,
          alt: false,
          shift: false,
          meta: false
        },
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
        ) ||
        !(
          style.accent_color === undefined ||
          ['blue', 'purple', 'green', 'orange', 'pink'].includes(style.accent_color) ||
          (typeof style.accent_color === 'string' &&
            HEX_COLOR_PATTERN.test(style.accent_color))
        ) ||
        !(
          style.surface_color === undefined ||
          ['default', 'blue', 'purple', 'green', 'orange', 'pink'].includes(style.surface_color) ||
          (typeof style.surface_color === 'string' &&
            HEX_COLOR_PATTERN.test(style.surface_color))
        ) ||
        !(
          style.custom_accent_colors === undefined ||
          (Array.isArray(style.custom_accent_colors) &&
            style.custom_accent_colors.every(color =>
              typeof color === 'string' && HEX_COLOR_PATTERN.test(color)
            ))
        ) ||
        !(
          style.custom_surface_colors === undefined ||
          (Array.isArray(style.custom_surface_colors) &&
            style.custom_surface_colors.every(color =>
              typeof color === 'string' && HEX_COLOR_PATTERN.test(color)
            ))
        ) ||
        !(
          style.surface_color_version === undefined ||
          style.surface_color_version === 1
        ) ||
        !(
          style.font_family === undefined ||
          ['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(
            style.font_family
          )
        ) ||
        !(
          style.border_radius === undefined ||
          /^(?:0|[1-9]|1[0-9]|20)$/.test(String(style.border_radius))
        ) ||
        !(
          style.sidebar_labels === undefined ||
          typeof style.sidebar_labels === 'boolean'
        ) ||
        !(
          style.sidebar_icons === undefined ||
          typeof style.sidebar_icons === 'boolean'
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
        !Array.isArray(favorites) ||
        favorites.some(id => typeof id !== 'string' || id.length > 160)
      ) {
        throw new Error('The exported favorites are invalid.');
      }

      if (
        !isRecord(hotkey) ||
        typeof hotkey.code !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(hotkey.code) ||
        hotkey.code === 'Escape' ||
        ['ctrl', 'alt', 'shift', 'meta'].some(
          modifier => typeof hotkey[modifier] !== 'boolean'
        )
      ) {
        throw new Error('The exported menu hotkey is invalid.');
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

      return {
        css,
        style,
        position,
        plugins,
        backgrounds,
        favorites,
        hotkey
      };
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
      onAppearanceChange,
      onSidebarLabelsChange,
      onSidebarIconsChange,
      onRestoreWelcome
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
            'Adjust the menu colors, shape, size, and opacity.'
        })
      );

      function createSliderLabels(input, stops, formatValue, unit) {
        const wrapper = el('div', 'sm-client-slider-wrap');
        const track = el('div', 'sm-client-slider-track');
        const labels = el('div', 'sm-slider-labels');
        const labelElements = stops.map(value => {
          const label = el('span', 'sm-slider-label', {
            textContent: formatValue(value)
          });
          label.dataset.value = String(value);
          const position = (
            (Number(value) - Number(input.min)) /
            (Number(input.max) - Number(input.min))
          ) * 100;
          label.style.left = position + '%';
          label.style.transform = position === 0
            ? 'translateX(0)'
            : position === 100
              ? 'translateX(-100%)'
              : 'translateX(-50%)';
          labels.appendChild(label);
          return label;
        });

        function update() {
          labelElements.forEach(label => {
            label.classList.toggle(
              'sm-label-active',
              Number(input.value) === Number(label.dataset.value)
            );
          });
          valueInput.value = input.value;
          stepButtons.forEach(({ button, direction }) => {
            button.disabled = direction < 0
              ? Number(input.value) <= Number(input.min)
              : Number(input.value) >= Number(input.max);
          });
        }

        const valueInput = el('input', 'sm-interface-value', {
          type: 'number',
          min: input.min,
          max: input.max,
          step: input.step,
          value: input.value
        });
        valueInput.setAttribute('aria-label', input.getAttribute('aria-label') + ' value');
        const valueGroup = el('div', 'sm-interface-value-group');
        const stepper = el('div', 'sm-interface-stepper');
        const stepButtons = [];

        [
          { direction: 1, action: 'Increase', path: 'M3 7.5 6 4.5l3 3' },
          { direction: -1, action: 'Decrease', path: 'M3 4.5 6 7.5l3-3' }
        ].forEach(({ direction, action, path }) => {
          const button = el('button', 'sm-interface-step', {
            type: 'button',
            title: action + ' ' + input.getAttribute('aria-label')
          });
          button.setAttribute('aria-label', button.title);

          const icon = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
          );
          icon.setAttribute('viewBox', '0 0 12 12');
          icon.setAttribute('aria-hidden', 'true');
          const arrow = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          );
          arrow.setAttribute('d', path);
          icon.appendChild(arrow);
          button.appendChild(icon);
          button.addEventListener('click', () => {
            const next = Math.max(
              Number(input.min),
              Math.min(
                Number(input.max),
                Number(input.value) + direction * Number(input.step)
              )
            );
            if (next === Number(input.value)) return;
            input.value = String(next);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
          stepper.appendChild(button);
          stepButtons.push({ button, direction });
        });

        valueInput.addEventListener('input', () => {
          const value = Number(valueInput.value);
          if (
            valueInput.value === '' ||
            !Number.isFinite(value) ||
            value < Number(input.min) ||
            value > Number(input.max)
          ) {
            return;
          }
          input.value = String(value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        valueInput.addEventListener('change', () => {
          const value = Number(valueInput.value);
          const valid = valueInput.value !== '' &&
            Number.isFinite(value) &&
            value >= Number(input.min) &&
            value <= Number(input.max);
          if (!valid) valueInput.value = input.value;
          else input.value = String(value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        input.addEventListener('input', update);
        track.append(input, labels);
        valueGroup.append(
          valueInput,
          stepper,
          el('span', 'sm-interface-unit', { textContent: unit })
        );
        wrapper.append(track, valueGroup);
        update();
        return { root: wrapper, update };
      }

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
      const backgroundOpacityControl = createSliderLabels(
        backgroundOpacityInput,
        [0, 25, 35, 50, 75, 100],
        value => value + '%',
        '%'
      );
      const opacityRow = el('label', 'sm-client-appearance-row');
      opacityRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Background Tint Opacity'
        }),
        backgroundOpacityControl.root
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
      const menuWidthControl = createSliderLabels(
        menuWidthInput,
        [810, 900, 1000],
        value => value,
        'px'
      );
      const menuWidthRow = el('label', 'sm-client-appearance-row');
      menuWidthRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Menu Width'
        }),
        menuWidthControl.root
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
      menuHeightInput.setAttribute('aria-label', 'Menu height, default 720 pixels');
      menuHeightInput.title = 'Default: 720px';
      const menuHeightControl = createSliderLabels(
        menuHeightInput,
        [400, 720, 1000],
        value => value,
        'px'
      );
      const menuHeightRow = el('label', 'sm-client-appearance-row');
      menuHeightRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Menu Height'
        }),
        menuHeightControl.root
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
      const cardOpacityControl = createSliderLabels(
        cardOpacityInput,
        [0, 25, 50, 60, 75, 100],
        value => value + '%',
        '%'
      );
      const cardOpacityRow = el('label', 'sm-client-appearance-row');
      cardOpacityRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Card Opacity'
        }),
        cardOpacityControl.root
      );

      const borderRadiusInput = el(
        'input',
        'sm-client-opacity-slider sm-example-slider sm-client-radius-slider',
        {
          type: 'range',
          min: '0',
          max: '20',
          step: '1',
          value: styleSettings.border_radius
        }
      );
      borderRadiusInput.setAttribute('aria-label', 'Border radius, 0 to 20 pixels');
      const borderRadiusControl = createSliderLabels(
        borderRadiusInput,
        [0, 4, 8, 12, 16, 20],
        value => value,
        'px'
      );
      const borderRadiusRow = el('label', 'sm-client-appearance-row');
      borderRadiusRow.append(
        el('span', 'sm-client-appearance-label', {
          textContent: 'Border Radius'
        }),
        borderRadiusControl.root
      );

      const fontRow = el('div', 'sm-client-appearance-row sm-client-font-row');
      fontRow.appendChild(el('span', 'sm-client-appearance-label', {
        textContent: 'Menu Font'
      }));
      let fontFamily = ['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(
        styleSettings.font_family
      ) ? styleSettings.font_family : 'kanit';
      const fontDropdown = el('details', 'sm-client-background-picker sm-client-font-picker');
      const fontTrigger = el('summary', 'sm-client-background-trigger');
      const fontLabel = el('span', 'sm-client-background-current');
      fontTrigger.appendChild(fontLabel);
      const fontOptions = el('div', 'sm-client-background-options');
      fontOptions.setAttribute('role', 'listbox');
      fontDropdown.append(fontTrigger, fontOptions);
      fontTrigger.setAttribute('aria-label', 'Menu font');

      const fontChoices = [
        { value: 'kanit', label: 'Kanit' },
        { value: 'gill-sans-mt', label: 'Gill Sans MT' },
        { value: 'open-dyslexic', label: 'OpenDyslexic' }
      ];

      function renderFontOptions() {
        const selected = fontChoices.find(choice => choice.value === fontFamily) ||
          fontChoices[0];
        fontLabel.textContent = selected.label;
        fontTrigger.setAttribute('aria-label', 'Menu font: ' + selected.label);
        fontOptions.replaceChildren();
        fontChoices.forEach(choice => {
          const isSelected = choice.value === fontFamily;
          const button = el('button', 'sm-client-background-option', {
            type: 'button',
            textContent: choice.label
          });
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(isSelected));
          button.addEventListener('click', () => {
            fontFamily = choice.value;
            fontDropdown.open = false;
            fontTrigger.focus();
            renderFontOptions();
            previewAppearance();
            saveAppearance();
          });
          fontOptions.appendChild(button);
        });
      }

      window.addEventListener('hydrogen-font-change', event => {
        const font = event.detail?.font;
        if (['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(font)) {
          fontFamily = font;
          renderFontOptions();
        }
      });
      renderFontOptions();
      fontRow.appendChild(fontDropdown);

      const accentRow = el('div', 'sm-client-appearance-row sm-accent-row');
      accentRow.appendChild(el('span', 'sm-client-appearance-label', {
        textContent: 'Accent Color'
      }));
      const accentPresets = el('div', 'sm-accent-presets');
      function createCustomColorControl(
        container,
        colors,
        buttons,
        label,
        fallbackColor,
        onSelect
      ) {
        const addControl = el('label', 'sm-accent-preset sm-accent-add');
        addControl.title = 'Add custom ' + label + ' color';
        const addIcon = el('span', null, { textContent: '+' });
        const input = el('input', 'sm-accent-color-input', {
          type: 'color',
          value: fallbackColor
        });
        input.setAttribute('aria-label', 'Add custom ' + label + ' color');
        addControl.append(addIcon, input);
        container.appendChild(addControl);

        function render() {
          buttons.forEach(button => button.remove());
          buttons.length = 0;
          colors.forEach(color => {
            const button = el(
              'button',
              'sm-accent-preset sm-accent-custom-preset',
              { type: 'button', title: 'Custom ' + label + ' color ' + color }
            );
            button.setAttribute(
              'aria-label',
              'Custom ' + label + ' color ' + color
            );
            button.style.setProperty('--sm-preset-color', color);
            button.dataset.color = color;
            button.addEventListener('click', () => onSelect(color));
            container.insertBefore(button, addControl);
            buttons.push(button);
          });
        }

        input.addEventListener('change', () => {
          const color = input.value.toLowerCase();
          if (!colors.includes(color)) colors.push(color);
          render();
          onSelect(color);
        });

        render();
        return { input, render };
      }

      const accentColors = {
        blue: '#2bb0ff',
        purple: '#a855f7',
        green: '#22c55e',
        orange: '#f97316',
        pink: '#ec4899'
      };
      let accentColor = styleSettings.accent_color;
      const customAccentColors = [
        ...(styleSettings.custom_accent_colors || [])
      ];
      const customAccentButtons = [];
      const accentButtons = Object.entries(accentColors).map(([name, color]) => {
        const button = el('button', 'sm-accent-preset', {
          type: 'button',
          title: name[0].toUpperCase() + name.slice(1)
        });
        button.setAttribute('aria-label', name + ' accent color');
        button.style.setProperty('--sm-preset-color', color);
        button.dataset.color = name;
        button.addEventListener('click', () => selectAccentColor(name));
        accentPresets.appendChild(button);
        return button;
      });

      function updateAccentSelection() {
        [...accentButtons, ...customAccentButtons].forEach(button => {
          const selected = button.dataset.color === accentColor;
          button.classList.toggle('sm-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      }

      let customAccentControl;
      function selectAccentColor(color) {
        accentColor = color;
        if (customAccentControl) {
          customAccentControl.input.value =
            HEX_COLOR_PATTERN.test(color) ? color : accentColors.blue;
        }
        updateAccentSelection();
        previewAppearance();
        saveAppearance();
      }

      customAccentControl = createCustomColorControl(
        accentPresets,
        customAccentColors,
        customAccentButtons,
        'accent',
        accentColors.blue,
        selectAccentColor
      );
      accentRow.appendChild(accentPresets);

      const surfaceRow = el('div', 'sm-client-appearance-row sm-accent-row');
      surfaceRow.appendChild(el('span', 'sm-client-appearance-label', {
        textContent: 'Cards & Active Tab Color'
      }));
      const surfacePresets = el('div', 'sm-accent-presets');
      let surfaceColor = styleSettings.surface_color;
      const customSurfaceColors = [
        ...(styleSettings.custom_surface_colors || [])
      ];
      const customSurfaceButtons = [];
      const surfaceColors = {
        default: '#151515',
        ...accentColors
      };
      const surfaceButtons = Object.entries(surfaceColors).map(([name, color]) => {
        const button = el('button', 'sm-accent-preset', {
          type: 'button',
          title: name[0].toUpperCase() + name.slice(1)
        });
        button.setAttribute(
          'aria-label',
          (name === 'default' ? 'Default gray' : name) +
          ' cards and active tab color'
        );
        button.style.setProperty('--sm-preset-color', color);
        button.dataset.color = name;
        button.addEventListener('click', () => selectSurfaceColor(name));
        surfacePresets.appendChild(button);
        return button;
      });

      function updateSurfaceSelection() {
        [...surfaceButtons, ...customSurfaceButtons].forEach(button => {
          const selected = button.dataset.color === surfaceColor;
          button.classList.toggle('sm-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      }

      let customSurfaceControl;
      function selectSurfaceColor(color) {
        surfaceColor = color;
        if (customSurfaceControl) {
          customSurfaceControl.input.value =
            HEX_COLOR_PATTERN.test(color) ? color : surfaceColors.default;
        }
        updateSurfaceSelection();
        previewAppearance();
        saveAppearance();
      }

      customSurfaceControl = createCustomColorControl(
        surfacePresets,
        customSurfaceColors,
        customSurfaceButtons,
        'cards and active tab',
        surfaceColors.default,
        selectSurfaceColor
      );
      surfaceRow.appendChild(surfacePresets);

      const sidebarLabelsRow = el('div', 'sm-client-appearance-row');
      sidebarLabelsRow.appendChild(el('span', 'sm-client-appearance-label', {
        textContent: 'Sidebar Labels'
      }));
      let sidebarLabels = styleSettings.sidebar_labels;
      const sidebarLabelsToggle = el(
        'div',
        'sm-plugin-toggle-control sm-client-sidebar-label-toggle'
      );
      sidebarLabelsToggle.setAttribute('role', 'group');
      sidebarLabelsToggle.setAttribute('aria-label', 'Sidebar Labels');
      const sidebarLabelsCheckbox = el('input', 'sm-plugin-checkbox', {
        type: 'checkbox'
      });
      sidebarLabelsCheckbox.setAttribute('aria-hidden', 'true');
      sidebarLabelsCheckbox.tabIndex = -1;
      const sidebarLabelsSegment = el('div', 'sm-plugin-seg');
      const sidebarLabelsPill = el('span', 'sm-plugin-seg-pill');
      const disableSidebarLabelsButton = el(
        'button',
        'sm-plugin-seg-btn sm-plugin-seg-off',
        {
          type: 'button',
          textContent: 'Disabled'
        }
      );
      const enableSidebarLabelsButton = el(
        'button',
        'sm-plugin-seg-btn sm-plugin-seg-on',
        {
          type: 'button',
          textContent: 'Enabled'
        }
      );
      sidebarLabelsSegment.append(
        sidebarLabelsPill,
        disableSidebarLabelsButton,
        enableSidebarLabelsButton
      );
      sidebarLabelsToggle.append(sidebarLabelsCheckbox, sidebarLabelsSegment);

      function updateSidebarLabelsToggle() {
        sidebarLabelsCheckbox.checked = sidebarLabels;
        disableSidebarLabelsButton.classList.toggle(
          'sm-selected',
          !sidebarLabels
        );
        enableSidebarLabelsButton.classList.toggle(
          'sm-selected',
          sidebarLabels
        );
        disableSidebarLabelsButton.setAttribute(
          'aria-pressed',
          String(!sidebarLabels)
        );
        enableSidebarLabelsButton.setAttribute(
          'aria-pressed',
          String(sidebarLabels)
        );
        onSidebarLabelsChange?.(sidebarLabels);
      }

      function setSidebarLabels(enabled) {
        if (sidebarLabels === enabled) return;

        sidebarLabelsSegment.classList.remove('sm-plugin-seg-go');
        void sidebarLabelsSegment.offsetWidth;
        sidebarLabelsSegment.classList.add('sm-plugin-seg-go');
        sidebarLabels = enabled;
        updateSidebarLabelsToggle();
        saveAppearance();
      }

      disableSidebarLabelsButton.addEventListener(
        'click',
        () => setSidebarLabels(false)
      );
      enableSidebarLabelsButton.addEventListener(
        'click',
        () => setSidebarLabels(true)
      );
      updateSidebarLabelsToggle();
      sidebarLabelsRow.appendChild(sidebarLabelsToggle);

      const sidebarIconsRow = el('div', 'sm-client-appearance-row');
      sidebarIconsRow.appendChild(el('span', 'sm-client-appearance-label', {
        textContent: 'Sidebar Icons'
      }));
      let sidebarIcons = styleSettings.sidebar_icons;
      const sidebarIconsToggle = el(
        'div',
        'sm-plugin-toggle-control sm-client-sidebar-icon-toggle'
      );
      sidebarIconsToggle.setAttribute('role', 'group');
      sidebarIconsToggle.setAttribute('aria-label', 'Sidebar Icons');
      const sidebarIconsCheckbox = el('input', 'sm-plugin-checkbox', {
        type: 'checkbox'
      });
      sidebarIconsCheckbox.setAttribute('aria-hidden', 'true');
      sidebarIconsCheckbox.tabIndex = -1;
      const sidebarIconsSegment = el('div', 'sm-plugin-seg');
      const sidebarIconsPill = el('span', 'sm-plugin-seg-pill');
      const disableSidebarIconsButton = el(
        'button',
        'sm-plugin-seg-btn sm-plugin-seg-off',
        {
          type: 'button',
          textContent: 'Disabled'
        }
      );
      const enableSidebarIconsButton = el(
        'button',
        'sm-plugin-seg-btn sm-plugin-seg-on',
        {
          type: 'button',
          textContent: 'Enabled'
        }
      );
      sidebarIconsSegment.append(
        sidebarIconsPill,
        disableSidebarIconsButton,
        enableSidebarIconsButton
      );
      sidebarIconsToggle.append(sidebarIconsCheckbox, sidebarIconsSegment);

      function updateSidebarIconsToggle() {
        sidebarIconsCheckbox.checked = sidebarIcons;
        disableSidebarIconsButton.classList.toggle(
          'sm-selected',
          !sidebarIcons
        );
        enableSidebarIconsButton.classList.toggle(
          'sm-selected',
          sidebarIcons
        );
        disableSidebarIconsButton.setAttribute(
          'aria-pressed',
          String(!sidebarIcons)
        );
        enableSidebarIconsButton.setAttribute(
          'aria-pressed',
          String(sidebarIcons)
        );
        onSidebarIconsChange?.(sidebarIcons);
      }

      function setSidebarIcons(enabled) {
        if (sidebarIcons === enabled) return;

        sidebarIconsSegment.classList.remove('sm-plugin-seg-go');
        void sidebarIconsSegment.offsetWidth;
        sidebarIconsSegment.classList.add('sm-plugin-seg-go');
        sidebarIcons = enabled;
        updateSidebarIconsToggle();
        saveAppearance();
      }

      disableSidebarIconsButton.addEventListener(
        'click',
        () => setSidebarIcons(false)
      );
      enableSidebarIconsButton.addEventListener(
        'click',
        () => setSidebarIcons(true)
      );
      updateSidebarIconsToggle();
      sidebarIconsRow.appendChild(sidebarIconsToggle);

      const appearanceStatus = el('div', 'sm-plugin-status');
      appearanceStatus.setAttribute('role', 'status');
      appearanceStatus.setAttribute('aria-live', 'polite');
      appearanceCard.append(
        appearanceHead,
        opacityRow,
        menuWidthRow,
        menuHeightRow,
        cardOpacityRow,
        borderRadiusRow,
        fontRow,
        accentRow,
        surfaceRow,
        sidebarLabelsRow,
        sidebarIconsRow,
        appearanceStatus
      );

      function syncAppearanceInputs() {
        backgroundOpacityInput.value = styleSettings.background_opacity;
        menuWidthInput.value = styleSettings.menu_width;
        menuHeightInput.value = styleSettings.menu_height;
        cardOpacityInput.value = styleSettings.card_opacity;
        borderRadiusInput.value = styleSettings.border_radius;
        fontFamily = ['kanit', 'gill-sans-mt', 'open-dyslexic'].includes(
          styleSettings.font_family
        ) ? styleSettings.font_family : 'kanit';
        renderFontOptions();
        accentColor = styleSettings.accent_color;
        surfaceColor = styleSettings.surface_color;
        customAccentColors.splice(
          0,
          customAccentColors.length,
          ...(styleSettings.custom_accent_colors || [])
        );
        customSurfaceColors.splice(
          0,
          customSurfaceColors.length,
          ...(styleSettings.custom_surface_colors || [])
        );
        customAccentControl.render();
        customSurfaceControl.render();
        customAccentControl.input.value =
          HEX_COLOR_PATTERN.test(accentColor) ? accentColor : accentColors.blue;
        customSurfaceControl.input.value =
          HEX_COLOR_PATTERN.test(surfaceColor)
            ? surfaceColor
            : surfaceColors.default;
        sidebarLabels = styleSettings.sidebar_labels;
        sidebarIcons = styleSettings.sidebar_icons;
        updateAccentSelection();
        updateSurfaceSelection();
        updateSidebarLabelsToggle();
        updateSidebarIconsToggle();
        updateDefaultStopHighlights();
        [
          backgroundOpacityControl,
          menuWidthControl,
          menuHeightControl,
          cardOpacityControl,
          borderRadiusControl
        ].forEach(control => control.update());
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
          Number(menuHeightInput.value) === 720
        );
        borderRadiusInput.classList.toggle(
          'sm-at-stop',
          Number(borderRadiusInput.value) === 16
        );
      }

      function getAppearanceSettings() {
        return {
          ...window.SM.storage.loadStyleSettings(),
          background_opacity: backgroundOpacityInput.value,
          menu_width: menuWidthInput.value,
          menu_height: menuHeightInput.value,
          card_opacity: cardOpacityInput.value,
          accent_color: accentColor,
          custom_accent_colors: [...customAccentColors],
          surface_color: surfaceColor,
          custom_surface_colors: [...customSurfaceColors],
          border_radius: borderRadiusInput.value,
          sidebar_labels: sidebarLabels,
          sidebar_icons: sidebarIcons,
          font_family: fontFamily
        };
      }

      function previewAppearance() {
        updateDefaultStopHighlights();
        updateAccentSelection();
        updateSurfaceSelection();
        [
          backgroundOpacityControl,
          menuWidthControl,
          menuHeightControl,
          cardOpacityControl,
          borderRadiusControl
        ].forEach(control => control.update());
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
        appearanceStatus.textContent = '';
      }

      updateDefaultStopHighlights();
      updateAccentSelection();
      updateSurfaceSelection();
      backgroundOpacityInput.addEventListener('input', previewAppearance);
      backgroundOpacityInput.addEventListener('change', saveAppearance);
      menuWidthInput.addEventListener('input', previewAppearance);
      menuWidthInput.addEventListener('change', saveAppearance);
      menuHeightInput.addEventListener('input', previewAppearance);
      menuHeightInput.addEventListener('change', saveAppearance);
      cardOpacityInput.addEventListener('input', previewAppearance);
      cardOpacityInput.addEventListener('change', saveAppearance);
      borderRadiusInput.addEventListener('input', previewAppearance);
      borderRadiusInput.addEventListener('change', saveAppearance);

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
      const backgroundDropdown = el(
        'details',
        'sm-client-background-picker'
      );
      const backgroundTrigger = el(
        'summary',
        'sm-client-background-trigger'
      );
      const backgroundLabel = el(
        'span',
        'sm-client-background-current'
      );
      backgroundTrigger.appendChild(backgroundLabel);
      backgroundTrigger.setAttribute('aria-label', 'Client background');
      const backgroundOptions = el(
        'div',
        'sm-client-background-options'
      );
      backgroundOptions.setAttribute('role', 'listbox');
      backgroundDropdown.append(backgroundTrigger, backgroundOptions);
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
          efk: 'Backgrounds/efk.webp',
          juice: 'Backgrounds/Juice.webp'
        };

        return chrome.runtime.getURL(paths[settings.selected] || paths.default);
      }

      function renderBackgroundOptions() {
        const builtInOptions = [
          ['default', 'Default'],
          ['main', 'Main'],
          ['halloween', 'Halloween'],
          ['newvsoldgen', 'New VS Oldgen'],
          ['theykilledher', 'They killed her'],
          ['behind', 'Behind'],
          ['ophelia', 'Ophelia'],
          ['efk', 'Efk'],
          ['juice', 'Juice']
        ].map(([id, label]) => ({ id, label }));
        const options = builtInOptions.concat(
          backgroundSettings.custom.map(background => ({
            id: background.id,
            label: background.name
          }))
        );
        const selected = options.find(
          option => option.id === backgroundSettings.selected
        ) || options[0];
        backgroundLabel.textContent = selected.label;
        backgroundTrigger.setAttribute(
          'aria-label',
          'Client background: ' + selected.label
        );
        backgroundOptions.replaceChildren();

        options.forEach(option => {
          const isSelected = option.id === backgroundSettings.selected;
          const button = el(
            'button',
            'sm-client-background-option',
            { type: 'button' }
          );
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(isSelected));

          const preview = el('img', 'sm-client-background-preview', {
            src: backgroundUrl({
              ...backgroundSettings,
              selected: option.id
            }),
            alt: ''
          });
          preview.loading = 'lazy';
          const label = el('span', null, { textContent: option.label });
          const check = el('span', 'sm-client-background-check', {
            textContent: isSelected ? '✓' : ''
          });
          check.setAttribute('aria-hidden', 'true');
          button.append(preview, label, check);
          button.addEventListener('click', () => {
            backgroundDropdown.open = false;
            backgroundTrigger.focus();
            void saveBackgroundSettings({
              ...backgroundSettings,
              selected: option.id
            });
          });
          backgroundOptions.appendChild(button);
        });

        removeBackgroundButton.hidden = !backgroundSettings.custom.some(
          background => background.id === backgroundSettings.selected
        );
      }

      async function saveBackgroundSettings(nextSettings) {
        if (!await window.SM.storage.saveBackgroundSettings(nextSettings)) {
          backgroundStatus.textContent =
            'Could not save background settings. Check available browser storage.';
          renderBackgroundOptions();
          return false;
        }

        backgroundSettings = nextSettings;
        onBackgroundChange?.(backgroundUrl(backgroundSettings));
        backgroundStatus.textContent = '';
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

      document.addEventListener('click', event => {
        if (!backgroundDropdown.contains(event.target)) {
          backgroundDropdown.open = false;
        }
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
        const saved = await saveBackgroundSettings(nextSettings);

        if (!saved && errors.length) {
          backgroundStatus.textContent += ' Upload errors: ' + errors.join('; ');
        } else if (saved && errors.length) {
          backgroundStatus.textContent =
            'Some images could not be uploaded: ' + errors.join('; ');
        }
      });

      removeBackgroundButton.addEventListener('click', async () => {
        const nextSettings = {
          custom: backgroundSettings.custom.filter(
            background => background.id !== backgroundSettings.selected
          ),
          selected: 'default'
        };

        await saveBackgroundSettings(nextSettings);
      });

      renderBackgroundOptions();
      backgrounds.append(
        backgroundsHead,
        backgroundDropdown,
        backgroundInput,
        removeBackgroundButton,
        backgroundStatus
      );

      backgroundDropdown.addEventListener('keydown', event => {
        if (event.key === 'Escape' && backgroundDropdown.open) {
          event.preventDefault();
          backgroundDropdown.open = false;
          backgroundTrigger.focus();
          return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        backgroundDropdown.open = true;
        const options = Array.from(
          backgroundOptions.querySelectorAll('button[role="option"]')
        );
        if (!options.length) return;

        const currentIndex = options.indexOf(document.activeElement);
        const nextIndex = event.key === 'ArrowDown'
          ? (currentIndex + 1) % options.length
          : (currentIndex <= 0 ? options.length - 1 : currentIndex - 1);
        options[nextIndex].focus();
      });

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

      const welcomeCard = el('div', 'sm-card');
      const welcomeHead = el('div', 'sm-card-head');
      welcomeHead.append(
        el('div', 'sm-card-title', {
          textContent: "I messed up, I don't know what I'm doing"
        }),
        el('div', 'sm-card-desc', {
          textContent:
            'Bring back the Hydrogen welcome screen and its quick-start guide.'
        })
      );
      const restoreWelcomeButton = el('button', 'sm-plugin-button', {
        type: 'button',
        textContent: 'Show welcome screen again'
      });
      restoreWelcomeButton.addEventListener('click', () => {
        if (onRestoreWelcome?.() !== true) {
          status.textContent =
            'Could not restore the welcome screen setting. Check browser storage.';
          return;
        }
        status.textContent = '';
      });
      welcomeCard.append(welcomeHead, restoreWelcomeButton);

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
      const importDetails = el('details', 'sm-raw-css-details');
      const importHead = el('summary', 'sm-card-head sm-raw-css-summary');
      importHead.append(
        el('div', 'sm-card-title', { textContent: 'Import Settings' }),
        el('div', 'sm-card-desc', {
          textContent:
            'Choose a Hydrogen JSON file. Importing replaces your current Hydrogen settings.'
        })
      );
      importDetails.appendChild(importHead);

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
      importDetails.append(
        importInput,
        importOr,
        importText,
        importTextButton
      );
      importCard.appendChild(importDetails);

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
        welcomeCard,
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
        status.textContent = '';

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
            menu_height: '720',
            card_opacity: '60',
            accent_color: 'blue',
            custom_accent_colors: [],
            surface_color: 'default',
            custom_surface_colors: [],
            surface_color_version: 1,
            border_radius: '16',
            sidebar_labels: true,
            sidebar_icons: true,
            font_family: 'kanit'
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

          if (!window.SM.storage.saveFavorites([])) {
            throw new Error('Could not reset favorites.');
          }

          if (!window.SM.storage.saveHotkey({
            code: 'ShiftRight',
            ctrl: false,
            alt: false,
            shift: false,
            meta: false
          })) {
            throw new Error('Could not reset the menu hotkey.');
          }

          getPluginKeys().forEach(key => localStorage.removeItem(key));

          backgroundSettings = defaultBackgroundSettings;
          styleSettings = window.SM.storage.loadStyleSettings();
          syncAppearanceInputs();
          onBackgroundChange?.(backgroundUrl(backgroundSettings));
          onAppearanceChange?.(styleSettings);
          renderBackgroundOptions();
          status.textContent = '';
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
          status.textContent = '';
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

          if (!window.SM.storage.saveFavorites(data.favorites)) {
            throw new Error('Could not save favorites.');
          }

          if (!window.SM.storage.saveHotkey(data.hotkey)) {
            throw new Error('Could not save the menu hotkey.');
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

          status.textContent = '';
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
