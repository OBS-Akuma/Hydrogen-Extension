(() => {
    'use strict';

    if (window.__HYDROGEN_FRIENDS_BANNED_COLOR__) return;
    window.__HYDROGEN_FRIENDS_BANNED_COLOR__ = true;

    const PLUGIN_ID = 'friends-banned-color';
    const API_URL = 'https://api2.kirka.io/api/WwMWm';
    const TARGET_ROLE = 'wNmWnMwW';

    function loadEnabled() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const settings = raw ? JSON.parse(raw) : {};

            return typeof settings.enabled === 'boolean'
                ? settings.enabled
                : true;
        } catch (error) {
            console.warn('[FriendsBannedColor] Could not load settings:', error);
            return true;
        }
    }

    let enabled = loadEnabled();
    let filteredFriends = [];
    let friendObserver = null;
    let urlObserver = null;
    let settingsObserver = null;
    let refreshTimeout = null;
    let lastUrl = location.href;

    const styledFriends = new Map();

    function saveEnabled() {
        try {
            localStorage.setItem(
                'sm_plugin_' + PLUGIN_ID,
                JSON.stringify({ enabled })
            );
        } catch (error) {
            console.error('[FriendsBannedColor] Could not save settings:', error);
        }
    }

    function el(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    async function fetchFriendsList() {
        const token = localStorage.getItem('token');

        if (!token) return;

        try {
            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.warn(
                    '[FriendsBannedColor] Friends request failed:',
                    response.status
                );
                return;
            }

            const data = await response.json();

            filteredFriends = (data.wnMNWm || [])
                .filter(friend => friend.WwMWmnwN === TARGET_ROLE)
                .map(friend => friend.WwMWmn);
        } catch (error) {
            console.error('[FriendsBannedColor] Friends request failed:', error);
        }
    }

    function restoreStyles() {
        styledFriends.forEach((original, nickname) => {
            nickname.style.color = original.color;
            nickname.style.textDecoration = original.decoration;
        });

        styledFriends.clear();
    }

    function applyStyles() {
        document.querySelectorAll(
            '.friend[data-v-97c118c6] .nickname'
        ).forEach(nickname => {
            const username = nickname.textContent.trim();
            const matched = filteredFriends.includes(username);

            if (matched) {
                if (!styledFriends.has(nickname)) {
                    styledFriends.set(nickname, {
                        color: nickname.style.color,
                        decoration: nickname.style.textDecoration
                    });
                }

                nickname.style.color = 'var(--red-3)';
                nickname.style.textDecoration = 'line-through';
            } else if (styledFriends.has(nickname)) {
                const original = styledFriends.get(nickname);

                nickname.style.color = original.color;
                nickname.style.textDecoration = original.decoration;

                styledFriends.delete(nickname);
            }
        });
    }

    async function refresh() {
        if (!enabled) return;

        await fetchFriendsList();

        if (enabled) applyStyles();
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(refresh, 300);
    }

    function setEnabled(value) {
        if (enabled === value) return;

        enabled = value;
        saveEnabled();

        if (enabled) {
            refresh();
        } else {
            restoreStyles();
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
        }

        offButton.addEventListener('click', () => setState(false));
        onButton.addEventListener('click', () => setState(true));
        checkbox.addEventListener('change', () => {
            setState(checkbox.checked);
        });

        segment.append(pill, offButton, onButton);
        root.append(checkbox, segment);

        sync();

        return root;
    }

    function createSettings() {
        const card = el('div', 'sm-card');
        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const header = el('div', 'sm-card-head');
        header.classList.add('sm-plugin-header');

        const heading = el('div', 'sm-plugin-heading');
        heading.append(
            el('div', 'sm-card-title', 'Friends Banned Color'),
            el(
                'div',
                'sm-card-desc',
                'Highlights banned friends in the friends list.'
            )
        );

        header.append(heading, makeToggleControl());
        card.appendChild(header);

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

    function start() {
        addSettings();

        if (!document.getElementById('tab-plugins')) {
            settingsObserver = new MutationObserver(() => {
                if (addSettings()) {
                    settingsObserver.disconnect();
                    settingsObserver = null;
                }
            });

            settingsObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        friendObserver = new MutationObserver(scheduleRefresh);
        friendObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        urlObserver = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(refresh, 500);
            }
        });
        urlObserver.observe(document, {
            childList: true,
            subtree: true
        });

        setInterval(refresh, 5000);
        refresh();
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
