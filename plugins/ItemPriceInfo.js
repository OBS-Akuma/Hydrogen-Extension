(() => {
    'use strict';

    if (window.__HYDROGEN_ITEM_PRICE_INFO__) return;
    window.__HYDROGEN_ITEM_PRICE_INFO__ = true;

    const PLUGIN_ID = 'item-price-info';

    // ===== CONFIG =====
    const PRICE_SHEET_URL =
        'https://opensheet.elk.sh/1pxMSoaSo8FYv-OIJ26HpSj8EDy7EDRmatHyQW24o6E4/Sorted+View';
    const RANK_API_URL = 'https://rank.daymian.xyz/api/skins/';
    const DATE_API_URL = 'https://api2.kirka.io/api/skin-art';
    const OWNED_API_URL = 'https://api2.kirka.io/api/wMWnwNmW';
    const FATE_SHEET_URL =
        'https://opensheet.elk.sh/19UpuXlaSltQlAa8rLDn2Na3lAB9ySdWDy_8vu4nOCYQ/1';
    const BROS_SHEET_URL =
        'https://opensheet.elk.sh/1tzHjKpu2gYlHoCePjp6bFbKBGvZpwDjiRzT9ZUfNwbY/4';

    function loadSettings() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const stored = raw ? JSON.parse(raw) : {};

            return {
                enabled:
                    typeof stored.enabled === 'boolean' ? stored.enabled : true,
                fate: typeof stored.fate === 'boolean' ? stored.fate : true,
                bros: typeof stored.bros === 'boolean' ? stored.bros : true,
                bolt: typeof stored.bolt === 'boolean' ? stored.bolt : true,
                owners:
                    typeof stored.owners === 'boolean' ? stored.owners : true,
                obtain:
                    typeof stored.obtain === 'boolean' ? stored.obtain : true,
                date: typeof stored.date === 'boolean' ? stored.date : true,
                rank: typeof stored.rank === 'boolean' ? stored.rank : true
            };
        } catch (error) {
            console.warn('[ItemPriceInfo] Could not load settings:', error);
            return {
                enabled: true,
                fate: true,
                bros: true,
                bolt: true,
                owners: true,
                obtain: true,
                date: true,
                rank: true
            };
        }
    }

    const settings = loadSettings();
    let enabled = settings.enabled;
    let dataLoaded = false;
    let settingsObserver = null;

    const state = {
        priceMap: new Map(),
        dateMap: new Map(),
        ownedMap: new Map(),
        obtainMap: new Map(),
        fateMap: new Map(),
        brosMap: new Map(),
        rankCache: new Map(),
        observer: null,
        intervalId: null,
        renderTimer: null,
        renderVersion: 0,
        currentName: null,
        stopped: false
    };

    // ===== HELPERS =====
    function normalizeName(name) {
        return String(name || '')
            .trim()
            .toLowerCase();
    }

    function parseValue(raw) {
        if (raw == null) return 0;

        const s = String(raw).trim();

        if (
            !s ||
            s.toUpperCase() === 'TBD' ||
            s.toLowerCase().includes('owners price')
        )
            return 0;

        const n = parseFloat(s.replace(/[, ]/g, ''));
        return Number.isNaN(n) ? 0 : n;
    }

    function getHighestTier(tiers) {
        if (!tiers) return null;

        let highest = null;
        let percentage = -1;

        const order = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

        for (const [tier, raw] of Object.entries(tiers)) {
            const value = Number(raw);

            if (
                value > percentage ||
                (value === percentage &&
                    (order[tier] || 0) > (order[highest] || 0))
            ) {
                percentage = value;
                highest = tier;
            }
        }

        return highest;
    }

    function getTierColor(tier) {
        return (
            {
                S: '#ff6b6b',
                A: '#ffa94d',
                B: '#ffd43b',
                C: '#a9e34b',
                D: '#63e6be',
                F: '#74c0fc'
            }[tier] || null
        );
    }

    function formatDateAdded(timestamp) {
        if (!timestamp) return null;

        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return null;

        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async function fetchJSON(url, options) {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    // ===== DATA LOADERS =====
    async function loadPriceData() {
        try {
            const rows = await fetchJSON(PRICE_SHEET_URL);

            for (const row of rows) {
                if (!row?.['Skin Name']) continue;

                const name = normalizeName(row['Skin Name']);
                const value = parseValue(row['Base Value']);

                if (value > 0 && !state.priceMap.has(name)) {
                    state.priceMap.set(name, value);
                }

                if (row['Obtainable By'] && !state.obtainMap.has(name)) {
                    state.obtainMap.set(
                        name,
                        String(row['Obtainable By']).trim()
                    );
                }
            }
        } catch (e) {
            console.warn('[inspect-addon] Price data failed:', e);
        }
    }

    async function loadDateData() {
        try {
            const rows = await fetchJSON(DATE_API_URL);

            for (const row of rows) {
                if (!row?.n || !row?.v) continue;

                const name = normalizeName(row.n);

                if (!state.dateMap.has(name)) {
                    state.dateMap.set(name, row.v);
                }
            }
        } catch (e) {
            console.warn('[inspect-addon] Date data failed:', e);
        }
    }

    // ===== OWNERS API =====
    async function loadOwnedData() {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const rows = await fetchJSON(OWNED_API_URL, { headers });

            for (const entry of rows) {
                const item = entry?.WwMWnmN;
                if (!item?.WwMWmn) continue;

                const name = normalizeName(item.WwMWmn);
                const owners = Number(entry?.wNmMn);

                if (!Number.isFinite(owners)) continue;

                state.ownedMap.set(name, owners);
            }

            console.log(
                `[inspect-addon] Loaded ${state.ownedMap.size} owner counts`
            );
        } catch (e) {
            console.warn('[inspect-addon] Owned data failed:', e);
        }
    }

    async function loadFateData() {
        try {
            const rows = await fetchJSON(FATE_SHEET_URL);

            for (const row of rows) {
                if (!row?.Name) continue;

                const name = normalizeName(row.Name);
                const value = parseValue(row['Base Value']);

                if (value > 0 && !state.fateMap.has(name)) {
                    state.fateMap.set(name, value);
                }
            }
        } catch (e) {
            console.warn('[inspect-addon] Fate data failed:', e);
        }
    }

    async function loadBrosData() {
        try {
            const rows = await fetchJSON(BROS_SHEET_URL);

            for (const row of rows) {
                if (!row?.['Skin Name']) continue;

                const name = normalizeName(row['Skin Name']);
                const value = parseValue(row.Price);

                if (value > 0 && !state.brosMap.has(name)) {
                    state.brosMap.set(name, value);
                }
            }
        } catch (e) {
            console.warn('[inspect-addon] Bros data failed:', e);
        }
    }

    // ===== RANK API =====
    async function fetchSkinRank(name) {
        const key = normalizeName(name);

        if (state.rankCache.has(key)) {
            return state.rankCache.get(key);
        }

        try {
            const slug = key.replace(/\s+/g, '-');
            const data = await fetchJSON(
                `${RANK_API_URL}${encodeURIComponent(slug)}`
            );

            const result = {
                rank: getHighestTier(data.tierPercentages),
                tierPercentages: data.tierPercentages,
                overallRank: data.overallRank,
                totalSkins: data.totalSkins,
                avgScore: data.avgScore,
                voteCount: data.voteCount
            };

            state.rankCache.set(key, result);
            return result;
        } catch {
            state.rankCache.set(key, null);
            return null;
        }
    }

    // ===== BADGE BUILDER =====
    function makeOwnedBadge(className = '') {
        const el = document.createElement('div');

        el.setAttribute('data-v-5104d13a', '');
        el.setAttribute('data-v-a1eaaeac', '');
        el.className = `owned ${className}`.trim();

        return el;
    }

    // ===== OWNERS COUNT: PLAIN TEXT =====
    function updateOwnedCount(ownedEl, name) {
        if (!ownedEl) return;

        if (!ownedEl.dataset.originalText) {
            ownedEl.dataset.originalText = ownedEl.textContent.trim();
        }

        if (!settings.owners) {
            ownedEl.textContent =
                ownedEl.dataset.originalText || ownedEl.textContent;
            delete ownedEl.dataset.ownedModified;
            delete ownedEl.dataset.originalText;
            return;
        }

        const owners = state.ownedMap.get(normalizeName(name));
        const original = ownedEl.dataset.originalText;
        const match = original.match(/^(\d+)(.*)$/);

        if (!match || owners === undefined) {
            if (ownedEl.dataset.ownedModified) {
                ownedEl.textContent = original;
                delete ownedEl.dataset.ownedModified;
            }
            return;
        }

        const [, units, rest] = match;

        ownedEl.textContent = `${units}/${owners} ${rest.trim()}`;
        ownedEl.dataset.ownedModified = '1';
    }

    // ===== CLEANUP GENERATED BADGES =====
    function removeGeneratedBadges(nameEl) {
        if (!nameEl) return;

        nameEl
            .querySelectorAll(
                '.inspect-value, .inspect-fate, .inspect-bros, .inspect-rank'
            )
            .forEach((el) => el.remove());

        const ownedEl = nameEl.querySelector(
            '.units-row > .owned:not(.inspect-value):not(.inspect-fate):not(.inspect-bros)'
        );

        if (ownedEl?.dataset.ownedModified) {
            ownedEl.textContent =
                ownedEl.dataset.originalText || ownedEl.textContent;
            delete ownedEl.dataset.ownedModified;
        }
    }

    // ===== MAIN RENDER =====
    async function addValueToInspect() {
        if (state.stopped) return;

        const modal = document.querySelector('#inspect-modal');
        const nameEl = modal?.querySelector('.name');
        const unitsRow = nameEl?.querySelector('.units-row');

        const ownedEl = unitsRow?.querySelector(
            '.owned:not(.inspect-value):not(.inspect-fate):not(.inspect-bros)'
        );

        if (!modal || !nameEl || !unitsRow || !ownedEl) return;

        const clone = nameEl.cloneNode(true);
        clone.querySelectorAll('.units-row').forEach((el) => el.remove());

        const name = clone.textContent
            .trim()
            .replace(/^Inspect:\s*/i, '')
            .trim();

        if (!name) return;

        const version = ++state.renderVersion;
        state.currentName = name;

        removeGeneratedBadges(nameEl);

        const currentRow = nameEl.querySelector('.units-row');

        const currentOwned = currentRow?.querySelector(
            '.owned:not(.inspect-value):not(.inspect-fate):not(.inspect-bros)'
        );

        if (!currentRow || !currentOwned) return;

        // ===== FATE — FIRST =====
        const fateValue = state.fateMap.get(normalizeName(name)) || 0;

        if (settings.fate && fateValue > 0) {
            const fateEl = makeOwnedBadge('inspect-fate');
            fateEl.textContent = `Fate: ${Math.round(fateValue).toLocaleString()}`;
            currentRow.insertBefore(fateEl, currentOwned);
        }

        // ===== BROS — SECOND =====
        const brosValue = state.brosMap.get(normalizeName(name)) || 0;

        if (settings.bros && brosValue > 0) {
            const brosEl = makeOwnedBadge('inspect-bros');
            brosEl.textContent = `Bros: ${Math.round(brosValue).toLocaleString()}`;
            currentRow.insertBefore(brosEl, currentOwned);
        }

        // ===== BOLT — THIRD =====
        const boltValue = state.priceMap.get(normalizeName(name)) || 0;

        if (settings.bolt && boltValue > 0) {
            const boltEl = makeOwnedBadge('inspect-value');
            boltEl.textContent = `Bolt: ${Math.round(boltValue).toLocaleString()}`;
            currentRow.insertBefore(boltEl, currentOwned);
        }

        // ===== NATIVE UNITS + OWNERS =====
        updateOwnedCount(currentOwned, name);

        // ===== DATE VALUE =====
        const date = formatDateAdded(state.dateMap.get(normalizeName(name)));

        // ===== RANK =====
        const rankData = settings.rank ? await fetchSkinRank(name) : null;

        if (state.stopped || version !== state.renderVersion) return;

        if (rankData?.rank) {
            const rankEl = makeOwnedBadge('inspect-rank');
            rankEl.append('Ranked: ');

            const span = document.createElement('span');
            span.textContent = rankData.rank;

            const color = getTierColor(rankData.rank);
            if (color) span.style.color = color;

            rankEl.appendChild(span);

            rankEl.style.cssText = `
        display: block !important;
        flex: 0 0 100% !important;
        width: max-content !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        margin-top: 5px !important;
        order: 10001 !important;
        position: relative !important;
        align-self: flex-start !important;
      `;

            currentRow.appendChild(rankEl);
        }

        // ===== OBTAINABLE BY + DATE: SAME LINE =====
        const card = modal.querySelector('.container-card') || modal;

        document
            .querySelectorAll('.inspect-footer')
            .forEach((el) => el.remove());

        const obtain = settings.obtain
            ? state.obtainMap.get(normalizeName(name))
            : null;

        if ((settings.date && date) || obtain) {
            if (getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }

            const footer = document.createElement('div');
            footer.className = 'inspect-footer';

            footer.style.cssText = `
        position: absolute !important;
        left: 1rem !important;
        bottom: 1rem !important;
        top: auto !important;
        right: auto !important;
        z-index: 10 !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 8px !important;
        width: max-content !important;
        max-width: calc(100% - 2rem) !important;
      `;

            if (obtain) {
                const badge = makeOwnedBadge('obtainable-by-badge');
                badge.textContent = obtain;
                badge.style.cssText = `
          display: inline-flex !important;
          flex: 0 1 auto !important;
          width: max-content !important;
          margin: 0 !important;
          position: relative !important;
        `;
                footer.appendChild(badge);
            }

            if (settings.date && date) {
                const dateEl = makeOwnedBadge('inspect-date');
                dateEl.textContent = date;
                dateEl.style.cssText = `
          display: inline-flex !important;
          flex: 0 0 auto !important;
          width: max-content !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          position: relative !important;
          margin: 0 !important;
        `;
                footer.appendChild(dateEl);
            }

            card.appendChild(footer);
        }
    }

    // ===== RENDER SCHEDULER =====
    function scheduleRender() {
        if (state.stopped) return;

        clearTimeout(state.renderTimer);

        state.renderTimer = setTimeout(() => {
            addValueToInspect();
        }, 150);
    }

    // ===== OBSERVER =====
    function setupObserver() {
        const modal = document.querySelector('#inspect-modal');

        if (modal) scheduleRender();

        state.observer = new MutationObserver((mutations) => {
            if (state.stopped) return;

            for (const mutation of mutations) {
                const target = mutation.target;

                if (
                    target instanceof Element &&
                    target.closest(
                        '.inspect-value, .inspect-fate, .inspect-bros, .inspect-rank, .inspect-date, .obtainable-by-badge, .inspect-footer'
                    )
                )
                    continue;

                if (
                    target instanceof Element &&
                    (target.id === 'inspect-modal' ||
                        target.closest('#inspect-modal'))
                ) {
                    scheduleRender();
                    return;
                }

                for (const node of mutation.addedNodes || []) {
                    if (
                        node instanceof Element &&
                        (node.id === 'inspect-modal' ||
                            node.querySelector?.('#inspect-modal'))
                    ) {
                        scheduleRender();
                        return;
                    }
                }
            }
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        state.intervalId = setInterval(() => {
            if (state.stopped) return;

            const modal = document.querySelector('#inspect-modal');
            if (!modal) return;

            const style = getComputedStyle(modal);

            if (style.display === 'none' || style.visibility === 'hidden')
                return;

            const nameEl = modal.querySelector('.name');
            if (!nameEl) return;

            const clone = nameEl.cloneNode(true);
            clone.querySelectorAll('.units-row').forEach((el) => el.remove());

            const currentName = clone.textContent
                .trim()
                .replace(/^Inspect:\s*/i, '')
                .trim();

            if (
                !nameEl.querySelector(
                    '.inspect-value, .inspect-fate, .inspect-bros'
                ) ||
                currentName !== state.currentName
            ) {
                scheduleRender();
            }
        }, 1000);
    }

    // ===== STOP =====
    function stop() {
        state.stopped = true;
        state.renderVersion++;

        clearTimeout(state.renderTimer);
        state.observer?.disconnect();
        state.observer = null;

        if (state.intervalId) clearInterval(state.intervalId);

        document
            .querySelectorAll(
                '.inspect-value, .inspect-fate, .inspect-bros, .inspect-rank, .inspect-date, .obtainable-by-badge, .inspect-footer'
            )
            .forEach((el) => el.remove());

        document
            .querySelectorAll(
                '#inspect-modal .name .owned[data-owned-modified]'
            )
            .forEach((el) => {
                el.textContent = el.dataset.originalText || el.textContent;

                delete el.dataset.ownedModified;
                delete el.dataset.originalText;
            });

        console.log('[ItemPriceInfo] stopped');
    }

    function saveSettings() {
        try {
            localStorage.setItem(
                'sm_plugin_' + PLUGIN_ID,
                JSON.stringify(settings)
            );
        } catch (error) {
            console.error('[ItemPriceInfo] Could not save settings:', error);
        }
    }

    function el(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function makeToggleControl(initialValue, onChange) {
        let value = initialValue;
        const root = el('div', 'sm-plugin-toggle-control');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sm-plugin-checkbox';
        checkbox.checked = value;

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
            checkbox.checked = value;
            offButton.classList.toggle('sm-selected', !value);
            onButton.classList.toggle('sm-selected', value);
            offButton.setAttribute('aria-pressed', String(!value));
            onButton.setAttribute('aria-pressed', String(value));
        }

        function setState(nextValue) {
            if (value === nextValue) return;

            segment.classList.remove('sm-plugin-seg-go');
            void segment.offsetWidth;
            segment.classList.add('sm-plugin-seg-go');

            value = nextValue;
            onChange(value);

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

        segment.append(pill, offButton, onButton);
        root.append(checkbox, segment);
        sync();

        return { root, sync };
    }

    function makeDisplaySetting(key, labelText) {
        const row = el('div', 'sm-plugin-setting-row');
        const label = el('span', 'sm-plugin-color-label', labelText);
        const toggle = makeToggleControl(settings[key], (value) => {
            settings[key] = value;
            saveSettings();
            state.renderVersion++;
            scheduleRender();
        });

        row.append(label, toggle.root);

        return row;
    }

    function createSettings() {
        const card = el('div', 'sm-card');
        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const header = el('div', 'sm-card-head');
        header.classList.add('sm-plugin-header');

        const heading = el('div', 'sm-plugin-heading');
        const title = el('div', 'sm-card-title', 'Item Price Info');
        const description = el(
            'div',
            'sm-card-desc',
            'Displays prices and item information on inspect cards.'
        );

        heading.append(title, description);

        const toggle = makeToggleControl(enabled, (value) => {
            enabled = value;
            settings.enabled = value;
            saveSettings();

            if (enabled) {
                start();
            } else {
                stop();
            }
        });
        header.append(heading, toggle.root);

        const displaySettings = el('div', 'sm-plugin-settings');
        displaySettings.append(
            makeDisplaySetting('fate', 'Fate price'),
            makeDisplaySetting('bros', 'Bros price'),
            makeDisplaySetting('bolt', 'Bolt price'),
            makeDisplaySetting('owners', 'Owner count'),
            makeDisplaySetting('obtain', 'Obtainable by'),
            makeDisplaySetting('date', 'Date added'),
            makeDisplaySetting('rank', 'Rank')
        );

        displaySettings.classList.toggle('sm-plugin-disabled', !enabled);
        toggle.root.addEventListener('hydrogen-toggle', (event) => {
            displaySettings.classList.toggle(
                'sm-plugin-disabled',
                !event.detail.enabled
            );
        });

        card.append(header, displaySettings);

        return card;
    }

    function addSettings() {
        const pluginsTab = document.getElementById('tab-plugins');
        if (!pluginsTab) return false;

        if (
            pluginsTab.querySelector(
                '[data-hydrogen-plugin="' + PLUGIN_ID + '"]'
            )
        ) {
            return true;
        }

        pluginsTab.appendChild(createSettings());
        return true;
    }

    async function start() {
        if (!enabled) return;

        state.stopped = false;

        if (!dataLoaded) {
            dataLoaded = true;

            console.log('[ItemPriceInfo] loading data...');

            await Promise.all([
                loadPriceData(),
                loadDateData(),
                loadOwnedData(),
                loadFateData(),
                loadBrosData()
            ]);
        }

        if (state.stopped || !enabled) return;

        if (!state.observer) {
            setupObserver();
        }

        addValueToInspect();

        console.log('[ItemPriceInfo] Plugin loaded.');
    }

    function startObserver() {
        if (settingsObserver) return;

        settingsObserver = new MutationObserver(() => {
            addSettings();
        });

        settingsObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    window.__inspectPriceAddon = {
        state,
        addValueToInspect,
        stop
    };

    if (document.body) {
        addSettings();
        startObserver();
        start();
    } else {
        document.addEventListener(
            'DOMContentLoaded',
            () => {
                addSettings();
                startObserver();
                start();
            },
            { once: true }
        );
    }
})();
