const UPDATE_URL =
  'https://raw.githubusercontent.com/OBS-Akuma/Hydrogen-Extension/refs/heads/main/json/Update.json';
const RELEASES_URL =
  'https://api.github.com/repos/OBS-Akuma/Hydrogen-Extension/releases';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'hydrogen.getChangelogs') {
    fetch(RELEASES_URL, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(releases => {
        if (!Array.isArray(releases)) {
          throw new Error('Release response must be an array');
        }

        sendResponse({
          releases: releases.map(release => ({
            body: typeof release?.body === 'string' ? release.body : '',
            date: typeof release?.published_at === 'string'
              ? release.published_at
              : ''
          }))
        });
      })
      .catch(error => {
        console.error('[Hydrogen] Could not load release notes:', error);
        sendResponse({ error: 'Could not load release notes' });
      });

    return true;
  }

  if (message?.type === 'hydrogen.checkUpdate') {
    fetch(UPDATE_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        return response.json();
      })
      .then(update => {
        if (
          !update ||
          typeof update !== 'object' ||
          Array.isArray(update) ||
          typeof update.crnt !== 'string'
        ) {
          throw new Error('Update data must contain a string crnt value');
        }

        sendResponse({
          available: update.crnt !== chrome.runtime.getManifest().version,
          ...(typeof update.wov === 'string' ? { wov: update.wov } : {})
        });
      })
      .catch(error => {
        console.error('[Hydrogen] Update check failed:', error);
        sendResponse({ error: 'Update check failed' });
      });

    return true;
  }

  if (message?.type === 'hydrogen.openExtensions') {
    chrome.tabs.create({ url: 'chrome://extensions' }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('[Hydrogen] Could not open the extensions page:', error.message);
        sendResponse({ error: error.message });
        return;
      }

      sendResponse({ opened: true });
    });

    return true;
  }

  return false;
});
