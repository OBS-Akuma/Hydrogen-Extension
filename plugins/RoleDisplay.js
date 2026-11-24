(() => {
    'use strict';

    if (window.__HYDROGEN_ROLE_DISPLAY__) return;
    window.__HYDROGEN_ROLE_DISPLAY__ = true;

    const PLUGIN_ID = 'role-display';
    const ROLE_DATA_URL =
        'https://raw.githubusercontent.com/OBS-Akuma/Ubuntu-client/refs/heads/main/assets/roledata.json';
    const TARGET_BANNED_ROLE = 'wwWMWn'; // <-- fixed: only this value = BANNED

    function loadEnabled() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const settings = raw ? JSON.parse(raw) : {};
            return typeof settings.enabled === 'boolean'
                ? settings.enabled
                : true;
        } catch (error) {
            console.warn('[RoleDisplay] Could not load settings:', error);
            return true;
        }
    }

    let enabled = loadEnabled();
    let roleMapping = null;
    let activeUserId = null;
    let requestId = 0;

    let profileObserver = null;
    let mappingPromise = null;

    function saveEnabled() {
        try {
            localStorage.setItem(
                'sm_plugin_' + PLUGIN_ID,
                JSON.stringify({ enabled })
            );
        } catch (error) {
            console.error('[RoleDisplay] Could not save settings:', error);
        }
    }

    function el(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function cleanId(value) {
        if (!value) return null;
        let v = String(value).trim();
        if (v.startsWith('#')) v = v.substring(1);
        return v || null;
    }

    function getShortId() {
        const node = document.querySelector('.copy-cont .value');
        if (!node) return null;
        return cleanId(node.textContent);
    }

    async function fetchRoleMapping() {
        if (mappingPromise) return mappingPromise;

        mappingPromise = (async () => {
            try {
                const response = await fetch(ROLE_DATA_URL);
                if (!response.ok) return null;
                return await response.json();
            } catch (err) {
                console.error('[RoleDisplay] Mapping error:', err);
                return null;
            }
        })();

        return mappingPromise;
    }

    async function fetchUserData(shortId) {
        if (!shortId) return null;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('[RoleDisplay] No token found.');
                return null;
            }

            console.log('[RoleDisplay] Sending payload:', {
                WNmwwM: shortId,
                wMWnwWNm: true
            });

            const response = await fetch(
                'https://api2.kirka.io/api/WwWMnNm/wmnWMwWN',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        WNmwwM: shortId,
                        wMWnwWNm: true
                    })
                }
            );

            if (!response.ok) {
                console.warn(
                    '[RoleDisplay] Request failed:',
                    response.status,
                    await response.text().catch(() => '')
                );
                return null;
            }

            return await response.json();
        } catch (err) {
            console.error('[RoleDisplay] Fetch error:', err);
            return null;
        }
    }

    function normColor(color) {
        if (!color) return null;
        const value = String(color).trim().toLowerCase();
        if (!value) return null;
        return value.startsWith('#') ? value : '#' + value;
    }

    function getDisplayRole(userData) {
        // Banned ONLY when WwWMnmNw === "wwWMWn"
        if (userData.WwWMnmNw === TARGET_BANNED_ROLE) {
            return { text: 'BANNED', isBanned: true };
        }

        const roleCode = userData.wnwWN || null;
        const roleColor = normColor(userData.wMWnNwW);

        if (roleCode && roleMapping?.[roleCode]) {
            return { text: roleMapping[roleCode], isBanned: false };
        }
        if (roleColor && roleMapping?.[roleColor]) {
            return { text: roleMapping[roleColor], isBanned: false };
        }
        return { text: roleCode || 'USER', isBanned: false };
    }

    function fitRoleText(element, maxPx = 20, minPx = 10) {
        element.style.removeProperty('font-size');
        if (!element.clientWidth) return;

        let size = maxPx;
        element.style.setProperty('font-size', size + 'px', 'important');

        while (element.scrollWidth > element.clientWidth && size > minPx) {
            size--;
            element.style.setProperty('font-size', size + 'px', 'important');
        }
    }

    function removeRoleCard() {
        document.querySelectorAll('.role-klo-card').forEach(card => card.remove());
    }

    function createRoleCard(userData) {
        if (!enabled || !userData) return;

        const kloCard = document.querySelector('.card.k-d');
        if (!kloCard) return;

        removeRoleCard();

        const roleInfo = getDisplayRole(userData);
        const roleColor = normColor(userData.wMWnNwW);

        const newCard = kloCard.cloneNode(true);
        newCard.className = 'card k-d role-klo-card';

        const statName = newCard.querySelector('.stat-name');
        if (statName) {
            statName.className = 'stat-name text-2 klo';
            statName.textContent = 'ROLE';
        }

        const statValue = newCard.querySelector('.stat-value');
        if (statValue) {
            statValue.className = 'stat-value stat-value-kd text-2';
            statValue.textContent = roleInfo.text;
            statValue.style.color = roleInfo.isBanned
                ? 'var(--red-3)'
                : roleColor || '';
            statValue.style.textDecoration = roleInfo.isBanned
                ? 'line-through'
                : 'none';

            requestAnimationFrame(() => fitRoleText(statValue));
        }

        kloCard.after(newCard);
    }

    async function init() {
        if (!enabled) return;

        const shortId = getShortId();
        if (!shortId) return;

        if (
            shortId === activeUserId &&
            document.querySelector('.role-klo-card')
        ) {
            return;
        }

        activeUserId = shortId;
        const currentRequest = ++requestId;

        const [mapping, userData] = await Promise.all([
            fetchRoleMapping(),
            fetchUserData(shortId)
        ]);

        if (!enabled || currentRequest !== requestId || shortId !== getShortId()) {
            return;
        }

        roleMapping = mapping;

        if (userData) {
            createRoleCard(userData);
        } else {
            removeRoleCard();
            console.warn('[RoleDisplay] No user data retrieved for', shortId);
        }
    }

    function makeToggleControl() {
        const root = el('div', 'sm-plugin-toggle-control');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sm-plugin-checkbox';
        checkbox.checked = enabled;

        const segment = el('div', 'sm-plugin-seg');
        const pill = el('span', 'sm-plugin-seg-pill');

        const offButton = el('button', 'sm-plugin-seg-btn sm-plugin-seg-off', 'Disabled');
        const onButton = el('button', 'sm-plugin-seg-btn sm-plugin-seg-on', 'Enabled');
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
                init();
            } else {
                requestId++;
                activeUserId = null;
                removeRoleCard();
            }

            sync();
            root.dispatchEvent(new CustomEvent('hydrogen-toggle', {
                bubbles: true,
                detail: { enabled }
            }));
        }

        offButton.addEventListener('click', () => setState(false));
        onButton.addEventListener('click', () => setState(true));

        segment.append(pill, offButton, onButton);
        root.append(checkbox, segment);
        sync();

        return { root, sync };
    }

    function createSettings() {
        const card = el('div', 'sm-card');
        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const header = el('div', 'sm-card-head');
        header.classList.add('sm-plugin-header');

        const heading = el('div', 'sm-plugin-heading');
        heading.append(
            el('div', 'sm-card-title', 'Role Display'),
            el('div', 'sm-card-desc', 'Displays player roles on their profile.')
        );

        const toggle = makeToggleControl();
        header.append(heading, toggle.root);
        card.append(header);
        return card;
    }

    function addSettings() {
        const pluginsTab = document.getElementById('tab-plugins');
        if (!pluginsTab) return false;

        if (pluginsTab.querySelector('[data-hydrogen-plugin="' + PLUGIN_ID + '"]')) {
            return true;
        }

        pluginsTab.appendChild(createSettings());
        return true;
    }

    function startObserver() {
        if (profileObserver) return;

        profileObserver = new MutationObserver(() => {
            if (!enabled) return;

            // best-effort, never blocks profile detection
            addSettings();

            const shortId = getShortId();
            if (
                shortId &&
                (shortId !== activeUserId ||
                    !document.querySelector('.role-klo-card'))
            ) {
                init();
            }
        });

        profileObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function start() {
        addSettings();
        startObserver();
        init();
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }

    console.log('[RoleDisplay] Plugin loaded.');
})();
