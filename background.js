const DATABASE_NAME = 'HydrogenScreenshotGallery';
const DATABASE_VERSION = 1;
const DEFAULT_HOTKEYS = {
  screenshot: ['KeyF', 'Digit1'],
  toggleMenu: ['ShiftRight']
};
const MESSAGE_TYPES = new Set([
  'hydrogen.captureScreenshot',
  'hydrogen.copyScreenshot',
  'hydrogen.deleteScreenshot',
  'hydrogen.getHotkeys',
  'hydrogen.getScreenshots',
  'hydrogen.saveHotkeys'
]);

let databasePromise = null;
let offscreenCreationPromise = null;

function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('screenshots', {
        keyPath: 'id',
        autoIncrement: true
      });
      database.createObjectStore('settings');
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () => {
      reject(request.error || new Error('Could not open screenshot storage.'));
    };
  }).catch(error => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

async function transact(storeName, mode, action) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => {
      reject(transaction.error || new Error('Screenshot storage failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error || new Error('Screenshot storage was aborted.'));
    };

    try {
      const request = action(transaction.objectStore(storeName));
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
        reject(request.error || new Error('Screenshot storage request failed.'));
      };
    } catch (error) {
      reject(error);
    }
  });
}

function isValidSequence(sequence) {
  return Array.isArray(sequence) &&
    sequence.length >= 1 &&
    sequence.length <= 2 &&
    sequence.every(code =>
      typeof code === 'string' &&
      /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(code) &&
      code !== 'Escape' &&
      code !== 'Unidentified'
    );
}

function validateHotkeys(hotkeys) {
  if (
    !hotkeys ||
    typeof hotkeys !== 'object' ||
    !isValidSequence(hotkeys.screenshot) ||
    !isValidSequence(hotkeys.toggleMenu)
  ) {
    throw new Error('The saved hotkeys are invalid.');
  }

  if (hotkeys.screenshot[0] === hotkeys.toggleMenu[0]) {
    throw new Error('The screenshot and menu hotkeys cannot start with the same key.');
  }

  return {
    screenshot: [...hotkeys.screenshot],
    toggleMenu: [...hotkeys.toggleMenu]
  };
}

function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      windowId,
      { format: 'png' },
      dataUrl => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(dataUrl);
      }
    );
  });
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!offscreenCreationPromise) {
    offscreenCreationPromise = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copy screenshot images to the clipboard.'
    }).finally(() => {
      offscreenCreationPromise = null;
    });
  }

  await offscreenCreationPromise;
}

async function handleMessage(message, sender) {
  if (!sender.tab) {
    throw new Error('Could not identify the active tab.');
  }

  switch (message.type) {
    case 'hydrogen.captureScreenshot': {
      const dataUrl = await captureVisibleTab(sender.tab.windowId);
      const createdAt = Date.now();
      const id = await transact('screenshots', 'readwrite', store =>
        store.add({ dataUrl, createdAt })
      );
      return { screenshot: { id, createdAt } };
    }

    case 'hydrogen.copyScreenshot': {
      if (!Number.isSafeInteger(message.id) || message.id < 1) {
        throw new Error('The screenshot ID is invalid.');
      }

      const screenshot = await transact('screenshots', 'readonly', store =>
        store.get(message.id)
      );
      if (!screenshot) {
        throw new Error('That screenshot no longer exists.');
      }

      await ensureOffscreenDocument();
      const response = await chrome.runtime.sendMessage({
        type: 'hydrogen.writeClipboard',
        dataUrl: screenshot.dataUrl
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Could not copy screenshot.');
      }

      return {};
    }

    case 'hydrogen.deleteScreenshot': {
      if (!Number.isSafeInteger(message.id) || message.id < 1) {
        throw new Error('The screenshot ID is invalid.');
      }

      await transact('screenshots', 'readwrite', store =>
        store.delete(message.id)
      );
      return {};
    }

    case 'hydrogen.getHotkeys': {
      const saved = await transact('settings', 'readonly', store =>
        store.get('hotkeys')
      );
      const hotkeys = saved
        ? validateHotkeys(saved)
        : { ...DEFAULT_HOTKEYS };

      if (!saved) {
        await transact('settings', 'readwrite', store =>
          store.put(hotkeys, 'hotkeys')
        );
      }

      return { hotkeys };
    }

    case 'hydrogen.getScreenshots': {
      const screenshots = await transact('screenshots', 'readonly', store =>
        store.getAll()
      );
      screenshots.sort((left, right) => right.createdAt - left.createdAt);
      return { screenshots };
    }

    case 'hydrogen.saveHotkeys': {
      const hotkeys = validateHotkeys(message.hotkeys);
      await transact('settings', 'readwrite', store =>
        store.put(hotkeys, 'hotkeys')
      );
      return { hotkeys };
    }

    default:
      throw new Error('Unknown Hydrogen request.');
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!MESSAGE_TYPES.has(message?.type)) return;

  handleMessage(message, sender).then(
    result => sendResponse({ ok: true, ...result }),
    error => {
      console.error('[Hydrogen] Request failed:', error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  );

  return true;
});
