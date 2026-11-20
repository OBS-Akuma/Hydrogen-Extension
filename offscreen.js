chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'hydrogen.writeClipboard') return;

  (async () => {
    if (
      typeof message.dataUrl !== 'string' ||
      !message.dataUrl.startsWith('data:image/png;base64,')
    ) {
      throw new Error('The screenshot image is invalid.');
    }

    const blob = await (await fetch(message.dataUrl)).blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  })().then(
    () => sendResponse({ ok: true }),
    error => {
      console.error('[Hydrogen] Clipboard write failed:', error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  );

  return true;
});
