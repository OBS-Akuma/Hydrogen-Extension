
(() => {
    'use strict';

    if (window.__HYDROGEN_TEXTURE_DOWNLOADER__) return;
    window.__HYDROGEN_TEXTURE_DOWNLOADER__ = true;

    const PLUGIN_ID = 'skin-texture-downloader';

    function loadEnabled() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const settings = raw ? JSON.parse(raw) : {};
            return typeof settings.enabled === 'boolean'
                ? settings.enabled
                : false;
        } catch (error) {
            console.warn('[TextureDownloader] Could not load settings:', error);
            return false;
        }
    }

    const PROCESSED = new WeakSet();
    const blobCache = new Map();
    const inFlight = new Map();

    let enabled = loadEnabled();
    let observer = null;

    function saveEnabled() {
        try {
            localStorage.setItem(
                'sm_plugin_' + PLUGIN_ID,
                JSON.stringify({ enabled })
            );
        } catch (error) {
            console.error('[TextureDownloader] Could not save settings:', error);
        }
    }

    // ------------------------------
    // Helpers
    // ------------------------------

    function el(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function buildTextureUrl(src) {
        return src
            .replace('skin-render', 'skin-texture')
            .replace('/3d/', '/');
    }

    // ------------------------------
    // Texture downloading
    // ------------------------------

    async function getTextureBlobUrl(url) {
        if (blobCache.has(url)) {
            return blobCache.get(url);
        }

        if (inFlight.has(url)) {
            return inFlight.get(url);
        }

        const promise = (async () => {
            const response = await fetch(url, {
                cache: 'force-cache'
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            blobCache.set(url, blobUrl);

            return blobUrl;
        })();

        inFlight.set(url, promise);

        try {
            return await promise;
        } finally {
            inFlight.delete(url);
        }
    }

    function makeTextureButton(textureUrl, fileName) {
        const btn = document.createElement('button');

        btn.className = 'button inspect-btn rectangle';
        btn.setAttribute('data-v-b9ada706', '');
        btn.setAttribute('data-v-40d0fea2', '');

        btn.style.backgroundColor = 'var(--green-4, #2ecc71)';
        btn.style.setProperty('--hover-color', 'var(--green-5, #27ae60)');
        btn.style.setProperty('--top', 'var(--green-5, #27ae60)');
        btn.style.setProperty('--bottom', 'var(--green-6, #1e8449)');

        const tri = document.createElement('div');
        tri.setAttribute('data-v-b9ada706', '');
        tri.className = 'triangle';

        const txt = document.createElement('div');
        txt.setAttribute('data-v-b9ada706', '');
        txt.className = 'text';
        txt.textContent = ' TEXTURE ';

        const wm = document.createElement('div');
        wm.setAttribute('data-v-b9ada706', '');
        wm.className = 'WWmwwnM';

        const bt = document.createElement('div');
        bt.setAttribute('data-v-b9ada706', '');
        bt.className = 'border-top border';

        const bb = document.createElement('div');
        bb.setAttribute('data-v-b9ada706', '');
        bb.className = 'border-bottom border';

        wm.append(bt, bb);
        btn.append(tri, txt, wm);

        btn.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();

            if (!enabled) return;

            btn.disabled = true;

            try {
                const blobUrl = await getTextureBlobUrl(textureUrl);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName || 'texture.webp';

                document.body.appendChild(a);
                a.click();
                a.remove();

            } catch (err) {
                console.warn('[TextureDownloader] Download failed:', err);

                window.open(textureUrl, '_blank', 'noopener');

            } finally {
                btn.disabled = false;
            }
        });

        return btn;
    }

    // ------------------------------
    // Skin card processing
    // ------------------------------

    function processCard(card) {
        if (!enabled || PROCESSED.has(card)) return;

        const img = card.querySelector('.shot-wrap img.shot');

        if (!img || !img.src) return;

        const textureUrl = buildTextureUrl(img.src);

        const nameEl = card.querySelector('.card-name');

        const skinName =
            (nameEl && nameEl.textContent.trim()) || 'skin';

        const fileName =
            skinName.replace(/[^\w\-]+/g, '_') + '-texture.webp';

        const inspectBtn = card.querySelector('button.inspect-btn');

        const textureButton = makeTextureButton(
            textureUrl,
            fileName
        );

        if (inspectBtn && inspectBtn.parentNode) {
            inspectBtn.parentNode.insertBefore(
                textureButton,
                inspectBtn.nextSibling
            );
        } else {
            card.appendChild(textureButton);
        }

        PROCESSED.add(card);
    }

    function processAll(root = document) {
        if (!enabled) return;

        root.querySelectorAll('.skins .grid .card').forEach(processCard);
    }

    // ------------------------------
    // Toggle control
    // ------------------------------

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

        const onButton = el(
            'button',
            'sm-plugin-seg-btn sm-plugin-seg-on',
            'Enabled'
        );

        offButton.type = 'button';
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

            enabled = value;
            saveEnabled();

            if (enabled) {
                processAll(document);
            }

            sync();
        }

        offButton.addEventListener('click', () => setState(false));
        onButton.addEventListener('click', () => setState(true));

        segment.append(pill, offButton, onButton);
        root.append(checkbox, segment);

        sync();

        return { root, sync };
    }

    // ------------------------------
    // Plugin UI
    // ------------------------------

    function createSettings() {
        const card = el('div', 'sm-card');

        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const header = el('div', 'sm-card-head');
        header.classList.add('sm-plugin-header');

        const heading = el('div', 'sm-plugin-heading');

        const title = el(
            'div',
            'sm-card-title',
            'Skin Texture Downloader'
        );

        const description = el(
            'div',
            'sm-card-desc',
            'Download original textures from skin previews.'
        );

        heading.append(title, description);

        const toggle = makeToggleControl();

        header.append(heading, toggle.root);
        card.append(header);

        return card;
    }

    // ------------------------------
    // Add UI to Plugins tab
    // ------------------------------

    function addSettings() {
        const pluginsTab = document.getElementById('tab-plugins');

        if (!pluginsTab) return false;

        const existing = pluginsTab.querySelector(
            '[data-hydrogen-plugin="' + PLUGIN_ID + '"]'
        );

        if (existing) return true;

        pluginsTab.appendChild(createSettings());

        console.log('[TextureDownloader] Settings UI added.');

        return true;
    }

    // ------------------------------
    // Global observer
    // ------------------------------

    function startObserver() {
        if (observer || !document.body) return;

        observer = new MutationObserver(() => {
            // Keep checking for the Plugins tab.
            addSettings();

            // Detect newly loaded skin cards.
            if (enabled) {
                processAll(document);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ------------------------------
    // Initialization
    // ------------------------------

    function start() {
        startObserver();

        // Try immediately.
        addSettings();

        // Process existing skins.
        processAll(document);

        console.log('[TextureDownloader] Plugin loaded.');
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, {
            once: true
        });
    }

})();
