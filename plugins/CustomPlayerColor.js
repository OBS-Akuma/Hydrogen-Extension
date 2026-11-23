
(() => {
    'use strict';

    if (window.__HYDROGEN_CUSTOM_PLAYER_COLOR__) return;
    window.__HYDROGEN_CUSTOM_PLAYER_COLOR__ = true;

    const PLUGIN_ID = 'custom-player-color';

    const DEFAULT_HEAD = '#E100E1';
    const DEFAULT_BODY = '#000000';

    function loadSettings() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const settings = raw ? JSON.parse(raw) : {};

            return {
                enabled: typeof settings.enabled === 'boolean'
                    ? settings.enabled
                    : false,
                headColor: /^#[0-9a-f]{6}$/i.test(settings.headColor)
                    ? settings.headColor
                    : DEFAULT_HEAD,
                bodyColor: /^#[0-9a-f]{6}$/i.test(settings.bodyColor)
                    ? settings.bodyColor
                    : DEFAULT_BODY
            };
        } catch (error) {
            console.warn('[Custom Player Color] Could not load settings:', error);
            return {
                enabled: false,
                headColor: DEFAULT_HEAD,
                bodyColor: DEFAULT_BODY
            };
        }
    }

    const savedSettings = loadSettings();
    let headColor = savedSettings.headColor;
    let bodyColor = savedSettings.bodyColor;
    let enabled = savedSettings.enabled;

    function saveSettings() {
        try {
            localStorage.setItem(
                'sm_plugin_' + PLUGIN_ID,
                JSON.stringify({ enabled, headColor, bodyColor })
            );
        } catch (error) {
            console.error('[Custom Player Color] Could not save settings:', error);
        }
    }

    const originalIsArray = Array.isArray;
    let patchedIsArray = null;

    const trackedMaps = new Map();

    function createSkinTexture(head, body) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = body;
        ctx.fillRect(0, 32, 64, 32);

        ctx.fillStyle = head;
        ctx.fillRect(0, 0, 64, 32);

        return canvas.toDataURL();
    }

    let playerTexture = createSkinTexture(headColor, bodyColor);

    function replaceTexture(map) {
        if (!enabled || !map || !map.image) return;

        const image = map.image;

        if (image.width !== 64 || image.height !== 64) return;

        if (!trackedMaps.has(map)) {
            trackedMaps.set(map, {
                image,
                originalSrc: image.src
            });
        }

        if (image.src !== playerTexture) {
            image.src = playerTexture;
            map.needsUpdate = true;
        }
    }

    function updateTrackedTextures() {
        for (const [map, saved] of trackedMaps) {
            if (!map || !saved.image || map.image !== saved.image) {
                trackedMaps.delete(map);
                continue;
            }

            saved.image.src = enabled
                ? playerTexture
                : saved.originalSrc;

            map.needsUpdate = true;
        }
    }

    function installHook() {
        if (patchedIsArray && Array.isArray === patchedIsArray) return;

        patchedIsArray = (...args) => {
            const target = args[0];

            if (
                enabled &&
                target &&
                target.map &&
                target.map.image
            ) {
                replaceTexture(target.map);
            }

            return originalIsArray(...args);
        };

        patchedIsArray.__hydrogenCustomPlayerColor = true;
        Array.isArray = patchedIsArray;
    }

    function removeHook() {
        if (Array.isArray === patchedIsArray) {
            Array.isArray = originalIsArray;
        }

        patchedIsArray = null;
    }

    function updateColors() {
        playerTexture = createSkinTexture(headColor, bodyColor);

        if (enabled) {
            updateTrackedTextures();
        }
    }

    function setEnabled(value, save = true) {
        enabled = !!value;

        if (enabled) {
            installHook();
        } else {
            removeHook();
        }

        updateTrackedTextures();

        if (save) saveSettings();
    }

    function el(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function makeToggleControl() {
        const root = el('div', 'sm-plugin-toggle-control');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sm-plugin-checkbox';
        checkbox.checked = enabled;

        const segment = el('div', 'sm-plugin-seg');
        const pill = el('span', 'sm-plugin-seg-pill');

        const offButton = el(
            'button',
            'sm-plugin-seg-btn sm-plugin-seg-off',
            'Disabled'
        );
        offButton.type = 'button';

        const onButton = el(
            'button',
            'sm-plugin-seg-btn sm-plugin-seg-on',
            'Enabled'
        );
        onButton.type = 'button';

        function sync() {
            checkbox.checked = enabled;

            offButton.classList.toggle('sm-selected', !enabled);
            onButton.classList.toggle('sm-selected', enabled);

            offButton.setAttribute('aria-pressed', String(!enabled));
            onButton.setAttribute('aria-pressed', String(enabled));
        }

        function setState(value) {
            if (enabled === value) return;

            segment.classList.remove('sm-plugin-seg-go');
            void segment.offsetWidth;
            segment.classList.add('sm-plugin-seg-go');

            setEnabled(value);
            sync();

            root.dispatchEvent(
                new CustomEvent('hydrogen-toggle', {
                    bubbles: true,
                    detail: { enabled: value }
                })
            );
        }

        offButton.addEventListener('click', () => setState(false));
        onButton.addEventListener('click', () => setState(true));

        checkbox.addEventListener('change', () => {
            setState(checkbox.checked);
        });

        segment.append(pill, offButton, onButton);
        root.append(checkbox, segment);

        sync();

        return { root, sync };
    }

    function createColorSetting(labelText, initialColor, callback) {
        const row = el('div', 'sm-plugin-color-row');

        const label = el(
            'label',
            'sm-plugin-color-label',
            labelText
        );

        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'sm-plugin-color-input';
        input.value = initialColor;

        input.addEventListener('input', () => {
            callback(input.value);
        });

        row.append(label, input);

        return {
            element: row,
            input
        };
    }

    function createSettings() {
        const card = el('div', 'sm-card');
        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const header = el('div', 'sm-card-head');
        header.classList.add('sm-plugin-header');

        const heading = el('div', 'sm-plugin-heading');

        const title = el(
            'div',
            'sm-card-title',
            'Custom Player Color'
        );

        const description = el(
            'div',
            'sm-card-desc',
            'Customize the colors of your player model.'
        );

        heading.append(title, description);

        const toggle = makeToggleControl();

        header.append(heading, toggle.root);

        const status = el(
            'div',
            'sm-plugin-status',
            enabled ? 'Enabled' : 'Disabled'
        );

        const colorSettings = el('div', 'sm-plugin-settings');

        const headSetting = createColorSetting(
            'Head Color',
            headColor,
            color => {
                headColor = color;
                updateColors();
                saveSettings();
            }
        );

        const bodySetting = createColorSetting(
            'Body Color',
            bodyColor,
            color => {
                bodyColor = color;
                updateColors();
                saveSettings();
            }
        );

        colorSettings.append(
            headSetting.element,
            bodySetting.element
        );

        const resetButton = el(
            'button',
            'sm-plugin-button',
            'Reset Colors'
        );

        resetButton.type = 'button';

        resetButton.addEventListener('click', () => {
            headColor = DEFAULT_HEAD;
            bodyColor = DEFAULT_BODY;

            headSetting.input.value = DEFAULT_HEAD;
            bodySetting.input.value = DEFAULT_BODY;

            updateColors();
            saveSettings();
        });

        colorSettings.appendChild(resetButton);

        toggle.root.addEventListener('hydrogen-toggle', event => {
            const isEnabled = event.detail.enabled;

            status.textContent = isEnabled ? 'Enabled' : 'Disabled';

            colorSettings.classList.toggle(
                'sm-plugin-disabled',
                !isEnabled
            );
        });

        if (!enabled) {
            colorSettings.classList.add('sm-plugin-disabled');
        }

        card.append(header, status, colorSettings);

        return card;
    }

    function addSettings() {
        const pluginsTab = document.getElementById('tab-plugins');

        if (!pluginsTab) return false;

        if (
            pluginsTab.querySelector(
                `[data-hydrogen-plugin="${PLUGIN_ID}"]`
            )
        ) {
            return true;
        }

        pluginsTab.appendChild(createSettings());

        return true;
    }

    async function initialize() {
        // Apply the saved state without triggering another save.
        setEnabled(enabled, false);

        // Create the settings UI.
        if (!addSettings()) {
            const observer = new MutationObserver(() => {
                if (addSettings()) {
                    observer.disconnect();
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        console.log(
            '[Custom Player Color] Initialized:',
            enabled ? 'Enabled' : 'Disabled'
        );
    }

    initialize();
})();
