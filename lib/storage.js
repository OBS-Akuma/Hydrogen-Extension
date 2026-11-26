
(function () {
  'use strict';

  const CSS_KEY = 'sm_css';
  const POS_KEY = 'sm_pos';
  const STYLE_SETTINGS_KEY = 'sm_style_settings';
  const BACKGROUND_SETTINGS_KEY = 'sm_background_settings';
  const FAVORITES_KEY = 'sm_favorites';
  const HOTKEY_KEY = 'sm_menu_hotkey';
  const ACCENT_PRESETS = ['blue', 'purple', 'green', 'orange', 'pink'];
  const BUILTIN_BACKGROUNDS = ['default', 'main', 'halloween', 'newvsoldgen', 'theykilledher', 'verclose', 'ophelia', 'efk'];
  const BACKGROUND_SETTINGS_DB_KEY = 'backgrounds';

  const DB_NAME = 'HydrogenStyleStorage';
  const DB_VERSION = 1;
  const STORE_NAME = 'settings';
  const DEFAULT_BACKGROUND_OPACITY = '35';
  const DEFAULT_MENU_WIDTH = '1000';
  const DEFAULT_MENU_HEIGHT = '660';
  const DEFAULT_CARD_OPACITY = '60';

  let cachedSettings = {
    cssUrl: '',
    files: [],
    interface_bounds: '',
    interface_opacity: '',
    background_opacity: DEFAULT_BACKGROUND_OPACITY,
    menu_width: DEFAULT_MENU_WIDTH,
    menu_height: DEFAULT_MENU_HEIGHT,
    card_opacity: DEFAULT_CARD_OPACITY,
    accent_color: 'blue',
    surface_color: 'blue',
    border_radius: '16',
    sidebar_labels: true
  };
  let cachedBackgroundSettings = { selected: 'default', custom: [] };

  let dbPromise = null;
  let writeQueue = Promise.resolve();
  let saveVersion = 0;

  // -----------------------------
  // Local storage
  // -----------------------------

  function readLocal(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      console.error('[SM Storage] LocalStorage read failed:', error);
      return fallback;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('[SM Storage] LocalStorage write failed:', error);
      return false;
    }
  }

  // -----------------------------
  // Settings helpers
  // -----------------------------

  function normalizeSettings(settings) {
    const boundsValue = settings?.interface_bounds == null
      ? ''
      : String(settings.interface_bounds);
    const interfaceBounds =
      boundsValue === '0'
        ? '80'
        : boundsValue === '1'
          ? '90'
          : /^(?:100|(?:8[0-9]|9[0-9]))$/.test(boundsValue)
            ? boundsValue
            : '';

    const opacityValue = settings?.interface_opacity == null
      ? ''
      : String(settings.interface_opacity);
    const interfaceOpacity =
      /^(?:100|[0-9]{1,2})$/.test(opacityValue)
        ? String(Number(opacityValue))
        : '';
    const backgroundOpacityValue = settings?.background_opacity == null
      ? ''
      : String(settings.background_opacity);
    const backgroundOpacity =
      /^(?:100|[0-9]{1,2})$/.test(backgroundOpacityValue)
        ? String(Number(backgroundOpacityValue))
        : DEFAULT_BACKGROUND_OPACITY;
    const menuWidthValue = settings?.menu_width == null
      ? ''
      : String(settings.menu_width);
    const menuWidth =
      /^(?:8[1-9][0-9]|9[0-9]{2}|1000)$/.test(menuWidthValue)
        ? menuWidthValue
        : DEFAULT_MENU_WIDTH;
    const menuHeightValue = settings?.menu_height == null
      ? ''
      : String(settings.menu_height);
    const menuHeight =
      /^(?:[4-9][0-9]{2}|1000)$/.test(menuHeightValue)
        ? menuHeightValue
        : DEFAULT_MENU_HEIGHT;
    const cardOpacityValue = settings?.card_opacity == null
      ? ''
      : String(settings.card_opacity);
    const cardOpacity =
      /^(?:100|[0-9]{1,2})$/.test(cardOpacityValue)
        ? String(Number(cardOpacityValue))
        : DEFAULT_CARD_OPACITY;
    const borderRadiusValue = settings?.border_radius == null
      ? ''
      : String(settings.border_radius);
    const borderRadius =
      /^(?:0|[1-9]|1[0-9]|20)$/.test(borderRadiusValue)
        ? borderRadiusValue
        : '16';

    return {
      cssUrl: typeof settings?.cssUrl === 'string'
        ? settings.cssUrl
        : '',

      files: Array.isArray(settings?.files)
        ? settings.files
            .filter(file =>
              file &&
              typeof file.name === 'string' &&
              typeof file.css === 'string'
            )
            .map(file => ({
              name: file.name,
              size: Number(file.size) || 0,
              css: file.css,
              enabled: file.enabled !== false
            }))
        : [],

      interface_bounds: interfaceBounds,

      interface_opacity: interfaceOpacity,
      background_opacity: backgroundOpacity,
      menu_width: menuWidth,
      menu_height: menuHeight,
      card_opacity: cardOpacity,
      accent_color: ACCENT_PRESETS.includes(settings?.accent_color)
        ? settings.accent_color
        : 'blue',
      surface_color: ACCENT_PRESETS.includes(settings?.surface_color)
        ? settings.surface_color
        : 'blue',
      border_radius: borderRadius,
      sidebar_labels: settings?.sidebar_labels !== false
    };
  }

  function cloneSettings(settings) {
    return {
      cssUrl: settings.cssUrl,
      files: settings.files.map(file => ({ ...file })),
      interface_bounds: settings.interface_bounds,
      interface_opacity: settings.interface_opacity,
      background_opacity: settings.background_opacity,
      menu_width: settings.menu_width,
      menu_height: settings.menu_height,
      card_opacity: settings.card_opacity,
      accent_color: settings.accent_color,
      surface_color: settings.surface_color,
      border_radius: settings.border_radius,
      sidebar_labels: settings.sidebar_labels
    };
  }

  function hasSettingsData(settings) {
    return !!(
      settings &&
      (settings.cssUrl || settings.files.length)
    );
  }

  function normalizeBackgroundSettings(settings) {
    const custom = [];
    const ids = new Set();

    if (Array.isArray(settings?.custom)) {
      settings.custom.forEach(background => {
        if (
          !background ||
          typeof background.id !== 'string' ||
          !/^[a-z0-9-]+$/i.test(background.id) ||
          BUILTIN_BACKGROUNDS.includes(background.id) ||
          ids.has(background.id) ||
          typeof background.name !== 'string' ||
          !background.name.trim() ||
          typeof background.data !== 'string' ||
          !/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(background.data)
        ) {
          return;
        }

        ids.add(background.id);
        custom.push({
          id: background.id,
          name: background.name,
          data: background.data
        });
      });
    }

    const selected = typeof settings?.selected === 'string' &&
      (
        BUILTIN_BACKGROUNDS.includes(settings.selected) ||
        ids.has(settings.selected)
      )
      ? settings.selected
      : 'default';

    return { selected, custom };
  }

  function makeRecord(settings) {
    return {
      ...cloneSettings(settings),
      _savedAt: Date.now()
    };
  }

  function readRecord(record) {
    if (!record || typeof record !== 'object') {
      return null;
    }

    return {
      settings: normalizeSettings(record),
      savedAt: Number(record._savedAt) || 0
    };
  }

  // -----------------------------
  // IndexedDB
  // -----------------------------

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        reject(request.error || new Error('Could not open database'));
      };

      request.onblocked = () => {
        reject(new Error('Database blocked'));
      };
    }).catch(error => {
      // Allow a future attempt to reopen the database.
      dbPromise = null;
      throw error;
    });

    return dbPromise;
  }

  function readDatabaseSettings(db) {
    return readDatabaseValue(db, 'style');
  }

  function writeDatabaseSettings(db, record) {
    return writeDatabaseValue(db, 'style', record);
  }

  function readDatabaseValue(db, key) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function writeDatabaseValue(db, key, value) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');

      transaction.objectStore(STORE_NAME).put(value, key);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => {
        reject(transaction.error || new Error('Database write failed'));
      };
      transaction.onabort = () => {
        reject(transaction.error || new Error('Database write aborted'));
      };
    });
  }

  function removeLegacyBackgroundSettings() {
    try {
      localStorage.removeItem(BACKGROUND_SETTINGS_KEY);
    } catch (error) {
      console.warn(
        '[SM Storage] Could not remove legacy background settings:',
        error
      );
    }
  }

  // -----------------------------
  // Initial load
  // -----------------------------

  const ready = (async () => {
    let localRecord = null;
    let databaseRecord = null;
    let localBackgroundSettings = null;
    let databaseBackgroundSettings = null;

    // Read localStorage.
    try {
      const raw = readLocal(STYLE_SETTINGS_KEY, '');

      if (raw) {
        localRecord = readRecord(JSON.parse(raw));
      }
    } catch (error) {
      console.warn('[SM Storage] Could not read local settings:', error);
    }

    try {
      const raw = readLocal(BACKGROUND_SETTINGS_KEY, '');

      if (raw) {
        localBackgroundSettings = normalizeBackgroundSettings(
          JSON.parse(raw)
        );
      }
    } catch (error) {
      console.warn(
        '[SM Storage] Could not read local background settings:',
        error
      );
    }

    // Read IndexedDB.
    try {
      const db = await openDatabase();
      const result = await readDatabaseSettings(db);

      databaseRecord = readRecord(result);
    } catch (error) {
      console.warn('[SM Storage] IndexedDB load failed:', error);
    }

    try {
      const db = await openDatabase();
      databaseBackgroundSettings = await readDatabaseValue(
        db,
        BACKGROUND_SETTINGS_DB_KEY
      );
    } catch (error) {
      console.warn('[SM Storage] Background settings load failed:', error);
    }

    if (databaseBackgroundSettings) {
      cachedBackgroundSettings = normalizeBackgroundSettings(
        databaseBackgroundSettings
      );
      removeLegacyBackgroundSettings();
    } else if (localBackgroundSettings) {
      cachedBackgroundSettings = localBackgroundSettings;

      try {
        const db = await openDatabase();
        await writeDatabaseValue(
          db,
          BACKGROUND_SETTINGS_DB_KEY,
          cachedBackgroundSettings
        );
        removeLegacyBackgroundSettings();
      } catch (error) {
        console.warn(
          '[SM Storage] Background settings migration failed:',
          error
        );
      }
    }

    // Pick whichever record was saved most recently.
    let selected = null;

    if (localRecord && databaseRecord) {
      selected = localRecord.savedAt > databaseRecord.savedAt
        ? localRecord
        : databaseRecord;
    } else {
      selected = localRecord || databaseRecord;
    }

    /*
     * Important:
     * If a save happened while startup was loading,
     * don't overwrite the newer in-memory settings.
     */
    if (saveVersion === 0) {
      cachedSettings = selected
        ? selected.settings
        : {
            cssUrl: '',
            files: [],
            interface_bounds: '',
            interface_opacity: '',
            background_opacity: DEFAULT_BACKGROUND_OPACITY,
            menu_width: DEFAULT_MENU_WIDTH,
            menu_height: DEFAULT_MENU_HEIGHT,
            card_opacity: DEFAULT_CARD_OPACITY,
            accent_color: 'blue',
            surface_color: 'blue',
            border_radius: '16',
            sidebar_labels: true
          };
    }

    // Migrate older records and synchronize storage.
    if (selected && saveVersion === 0) {
      const record = makeRecord(cachedSettings);

      writeLocal(STYLE_SETTINGS_KEY, JSON.stringify(record));

      try {
        const db = await openDatabase();
        await writeDatabaseSettings(db, record);
      } catch (error) {
        console.warn('[SM Storage] Initial sync failed:', error);
      }
    }

    console.log('[SM Storage] Settings loaded.');

    return true;
  })();

  // -----------------------------
  // Public storage API
  // -----------------------------

  window.SM = window.SM || {};

  window.SM.storage = {
    ready,

    loadCss() {
      return readLocal(CSS_KEY, '');
    },

    saveCss(text) {
      return writeLocal(CSS_KEY, String(text || ''));
    },

    loadPos() {
      try {
        const raw = readLocal(POS_KEY, '');

        if (!raw) return null;

        const position = JSON.parse(raw);

        if (
          typeof position.x === 'number' &&
          typeof position.y === 'number'
        ) {
          return position;
        }
      } catch (error) {
        console.warn('[SM Storage] Position load failed:', error);
      }

      return null;
    },

    savePos(x, y) {
      return writeLocal(
        POS_KEY,
        JSON.stringify({ x, y })
      );
    },

    loadFavorites() {
      try {
        const raw = readLocal(FAVORITES_KEY, '[]');
        const favorites = JSON.parse(raw);
        return Array.isArray(favorites)
          ? [...new Set(favorites.filter(
              id => typeof id === 'string' && id.length <= 160
            ))]
          : [];
      } catch (error) {
        console.warn('[SM Storage] Favorites load failed:', error);
        return [];
      }
    },

    saveFavorites(favorites) {
      if (!Array.isArray(favorites)) {
        console.error('[SM Storage] Favorites must be an array.');
        return false;
      }
      return writeLocal(
        FAVORITES_KEY,
        JSON.stringify([...new Set(favorites.filter(
          id => typeof id === 'string' && id.length <= 160
        ))])
      );
    },

    loadHotkey() {
      try {
        const raw = readLocal(HOTKEY_KEY, '');
        if (!raw) {
          return { code: 'ShiftRight', ctrl: false, alt: false, shift: false, meta: false };
        }

        const hotkey = JSON.parse(raw);
        if (
          !hotkey ||
          typeof hotkey.code !== 'string' ||
          !/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(hotkey.code) ||
          hotkey.code === 'Escape'
        ) {
          throw new Error('Invalid menu hotkey.');
        }

        return {
          code: hotkey.code,
          ctrl: false,
          alt: false,
          shift: false,
          meta: false
        };
      } catch (error) {
        console.warn('[SM Storage] Hotkey load failed:', error);
        return { code: 'ShiftRight', ctrl: false, alt: false, shift: false, meta: false };
      }
    },

    saveHotkey(hotkey) {
      if (
        !hotkey ||
        typeof hotkey.code !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(hotkey.code) ||
        hotkey.code === 'Escape'
      ) {
        console.error('[SM Storage] Invalid menu hotkey.');
        return false;
      }
      return writeLocal(HOTKEY_KEY, JSON.stringify({
        code: hotkey.code,
        ctrl: false,
        alt: false,
        shift: false,
        meta: false
      }));
    },

    loadStyleSettings() {
      return cloneSettings(cachedSettings);
    },

    loadBackgroundSettings() {
      return {
        selected: cachedBackgroundSettings.selected,
        custom: cachedBackgroundSettings.custom.map(background => ({
          ...background
        }))
      };
    },

    async saveBackgroundSettings(settings) {
      const normalized = normalizeBackgroundSettings(settings);

      try {
        const db = await openDatabase();
        await writeDatabaseValue(
          db,
          BACKGROUND_SETTINGS_DB_KEY,
          normalized
        );
        cachedBackgroundSettings = normalized;
        removeLegacyBackgroundSettings();
        return true;
      } catch (error) {
        console.error(
          '[SM Storage] IndexedDB background settings save failed:',
          error
        );

        const savedLocally = writeLocal(
          BACKGROUND_SETTINGS_KEY,
          JSON.stringify(normalized)
        );

        if (savedLocally) {
          cachedBackgroundSettings = normalized;
        }

        return savedLocally;
      }
    },

    async saveStyleSettings(settings) {
      const snapshot = normalizeSettings(settings);

      // Mark this as a newer save before startup can overwrite it.
      saveVersion++;

      cachedSettings = cloneSettings(snapshot);

      const record = makeRecord(snapshot);
      const serialized = JSON.stringify(record);

      // Save the backup immediately.
      const localSaved = writeLocal(
        STYLE_SETTINGS_KEY,
        serialized
      );

      if (!localSaved) {
        console.error('[SM Storage] Local backup could not be saved.');
      }

      // Queue database writes in order.
      writeQueue = writeQueue
        .catch(() => {})
        .then(async () => {
          await ready;

          try {
            const db = await openDatabase();
            await writeDatabaseSettings(db, record);

            console.log('[SM Storage] Settings saved to IndexedDB.');
          } catch (error) {
            console.error(
              '[SM Storage] IndexedDB save failed:',
              error
            );
          }
        });

      await writeQueue;
      return localSaved;
    }
  };
})();
