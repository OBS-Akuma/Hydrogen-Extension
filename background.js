chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'hydrogen.captureScreenshot') return;

  if (!sender.tab || typeof sender.tab.windowId !== 'number') {
    sendResponse({ ok: false, error: 'Could not identify the active tab.' });
    return;
  }

  chrome.tabs.captureVisibleTab(
    sender.tab.windowId,
    { format: 'png' },
    dataUrl => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      chrome.downloads.download({
        url: dataUrl,
        filename: `Hydrogen/Screenshot-${timestamp}.png`,
        saveAs: false
      }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }

        sendResponse({ ok: true });
      });
    }
  );

  return true;
});
