(() => {
    'use strict';

    if (window.__HYDROGEN_FRIENDS_BANNED_COLOR__) return;
    window.__HYDROGEN_FRIENDS_BANNED_COLOR__ = true;

    const PLUGIN_ID = 'friends-banned-color';
    const API_URL = 'https://api2.kirka.io/api/WwWMnNm';
    const TARGET_ROLE = 'wwWMWn';

    // How long a fetched friends list stays fresh before a re-fetch is allowed
    const CACHE_TTL_MS = 60_000;

    function loadEnabled() {
        try {
            const raw = localStorage.getItem('sm_plugin_' + PLUGIN_ID);
            const settings = raw ? JSON.parse(raw) : {};

            return typeof settings.enabled === 'boolean'
                ? settings.enabled
                : false;
        } catch (error) {
            console.warn('[FriendsBannedColor] Could not load settings:', error);
            return true;
        }
    }

    let enabled = loadEnabled();
    let filteredFriends = [];
    let filteredFriendsSet = new Set();
    let lastFetchTime = 0;
    let fetchInFlight = null;

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

    // ------------------------------------------------------------------
    // Friends panel detection
    // ------------------------------------------------------------------

    /**
     * Returns the friends panel container if it's currently mounted/visible.
     * Adjust the selector if your build uses a different container class.
     */
    function getFriendsPanel() {
        // The .friend elements live inside this container in the Kirka UI.
        // We use the first .friend's closest scroll container as the anchor.
        const firstFriend = document.querySelector('.friend[data-v-97c118c6]');
        if (!firstFriend) return null;

        // Walk up to a reasonable panel boundary (the list wrapper).
        // Falling back to firstFriend.parentElement is safe and narrow.
        return firstFriend.closest('.friends-list, .friends, .list') ||
            firstFriend.parentElement;
    }

    // ------------------------------------------------------------------
    // API fetch (cached + de-duplicated)
    // ------------------------------------------------------------------

    function isCacheFresh() {
        return (
            filteredFriends.length > 0 &&
            Date.now() - lastFetchTime < CACHE_TTL_MS
        );
    }

    async function fetchFriendsList({ force = false } = {}) {
        if (!force && isCacheFresh()) return filteredFriends;
        if (fetchInFlight) return fetchInFlight;

        const token = localStorage.getItem('token');
        if (!token) return filteredFriends;

        fetchInFlight = (async () => {
            try {
                const response = await fetch(API_URL, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) {
                    console.warn(
                        '[FriendsBannedColor] Friends request failed:',
                        response.status
                    );
                    return filteredFriends;
                }

                const data = await response.json();

                filteredFriends = (data.wnwWmWNM || [])
                    .filter(friend => friend.WwWMnmNw === TARGET_ROLE)
                    .map(friend => friend.WwWMnmwN);

                filteredFriendsSet = new Set(filteredFriends);
                lastFetchTime = Date.now();

                return filteredFriends;
            } catch (error) {
                console.error(
                    '[FriendsBannedColor] Friends request failed:',
                    error
                );
                return filteredFriends;
            } finally {
                fetchInFlight = null;
            }
        })();

        return fetchInFlight;
    }

    // ------------------------------------------------------------------
    // Styling
    // ------------------------------------------------------------------

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
            const matched = filteredFriendsSet.has(username);

            if (matched) {
                if (!styledFriends.has(nickname)) {
                    styledFriends.set(nickname, {
                        color: nickname.style.color,
                        decoration: nickname.style.textDecoration
                    });
                }

                // Only write when the style actually differs — avoids
                // re-triggering the MutationObserver.
                if (nickname.style.color !== 'var(--red-3)') {
                    nickname.style.color = 'var(--red-3)';
                }
                if (nickname.style.textDecoration !== 'line-through') {
                    nickname.style.textDecoration = 'line-through';
                }
            } else if (styledFriends.has(nickname)) {
                const original = styledFriends.get(nickname);

                if (nickname.style.color !== original.color) {
                    nickname.style.color = original.color;
                }
                if (nickname.style.textDecoration !== original.decoration) {
                    nickname.style.textDecoration = original.decoration;
                }

                styledFriends.delete(nickname);
            }
        });
    }

    // ------------------------------------------------------------------
    // Refresh orchestration
    // ------------------------------------------------------------------

    async function refresh({ force = false } = {}) {
        if (!enabled) return;

        // Don't hit the API at all if the friends panel isn't on screen.
        if (!getFriendsPanel()) return;

        await fetchFriendsList({ force });

        if (enabled) applyStyles();
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => refresh(), 300);
    }

    function setEnabled(value) {
        if (enabled === value) return;

        enabled = value;
        saveEnabled();

        if (enabled) {
            refresh({ force: true });
        } else {
            restoreStyles();
        }
    }

    // ------------------------------------------------------------------
    // Toggle control
    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------
    // Observers
    // ------------------------------------------------------------------

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

        // Watch ONLY the friends panel, not the whole body.
        // Re-resolve the panel target each time the observer is (re)attached,
        // because the friends list may be unmounted/remounted on navigation.
        function observeFriendsPanel() {
            const panel = getFriendsPanel();
            if (!panel) return;

            friendObserver = new MutationObserver(mutations => {
                // Ignore mutations that are only our own style writes.
                const relevant = mutations.some(m => {
                    const t = m.target;
                    if (!(t instanceof Element)) return true;
                    if (t.classList?.contains('nickname')) return false;
                    return true;
                });

                if (relevant) scheduleRefresh();
            });

            friendObserver.observe(panel, {
                childList: true,
                subtree: true
            });
        }

        observeFriendsPanel();

        // Route changes: re-check for the friends panel and re-attach the
        // observer, but only refresh when the panel is actually visible.
        urlObserver = new MutationObserver(() => {
            if (location.href === lastUrl) return;

            lastUrl = location.href;

            if (friendObserver) {
                friendObserver.disconnect();
                friendObserver = null;
            }

            // Give the SPA a moment to swap the route, then re-attach.
            setTimeout(() => {
                observeFriendsPanel();
                scheduleRefresh();
            }, 500);
        });

        urlObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // If the friends list mounts lazily (e.g. user opens the tab after
        // page load), the urlObserver won't catch it. A lightweight poll
        // that does NOT call the API — it only re-attaches the observer
        // when the panel appears — handles that case.
        const panelWatchInterval = setInterval(() => {
            if (!getFriendsPanel()) return;
            if (friendObserver) return;

            observeFriendsPanel();
            scheduleRefresh();
        }, 1000);

        // Ensure the interval is torn down if the plugin is disabled.
        const originalSetEnabled = setEnabled;
        setEnabled = function (value) {
            if (!value) {
                clearInterval(panelWatchInterval);
                if (friendObserver) {
                    friendObserver.disconnect();
                    friendObserver = null;
                }
            } else if (!friendObserver) {
                observeFriendsPanel();
            }
            originalSetEnabled(value);
        };

        refresh();
    }

    if (document.body) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
