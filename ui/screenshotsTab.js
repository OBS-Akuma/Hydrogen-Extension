(() => {
  const el = window.SM.el;

  window.SM.buildScreenshotsTab = function () {
    const root = el('div', 'sm-tab-content');
    root.id = 'tab-screenshots';

    const card = el('div', 'sm-card');
    const head = el('div', 'sm-card-head');
    head.append(
      el('div', 'sm-card-title', { textContent: 'Screenshots' }),
      el('div', 'sm-card-desc', {
        textContent: 'Your saved screenshots. Copy an image or delete it.'
      })
    );

    const status = el('div', 'sm-plugin-status', {
      textContent: 'Screenshots have not been loaded yet.'
    });
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const grid = el('div', 'sm-screenshot-grid');
    card.append(head, status, grid);
    root.appendChild(card);

    function showError(prefix, error) {
      console.error('[Hydrogen] ' + prefix, error);
      status.textContent = prefix + ': ' + error.message;
    }

    async function refresh() {
      status.textContent = 'Loading screenshots...';
      grid.replaceChildren();

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'hydrogen.getScreenshots'
        });

        if (!response?.ok) {
          throw new Error(response?.error || 'Could not load screenshots.');
        }

        if (!response.screenshots.length) {
          status.textContent = 'No screenshots yet. Use your screenshot hotkey.';
          return true;
        }

        status.textContent =
          response.screenshots.length +
          (response.screenshots.length === 1 ? ' screenshot' : ' screenshots');

        response.screenshots.forEach(screenshot => {
          const item = el('div', 'sm-screenshot-item');
          const image = el('img', 'sm-screenshot-image', {
            src: screenshot.dataUrl,
            alt: 'Screenshot from ' + new Date(screenshot.createdAt).toLocaleString(),
            loading: 'lazy'
          });
          const date = el('div', 'sm-screenshot-date', {
            textContent: new Date(screenshot.createdAt).toLocaleString()
          });
          const actions = el('div', 'sm-screenshot-actions');
          const copyButton = el('button', 'sm-plugin-button', {
            type: 'button',
            textContent: 'Copy Image'
          });
          const deleteButton = el('button', 'sm-plugin-button', {
            type: 'button',
            textContent: 'Delete'
          });

          copyButton.addEventListener('click', async () => {
            copyButton.disabled = true;

            try {
              const response = await chrome.runtime.sendMessage({
                type: 'hydrogen.copyScreenshot',
                id: screenshot.id
              });

              if (!response?.ok) {
                throw new Error(response?.error || 'Could not copy screenshot.');
              }

              status.textContent = 'Image copied to clipboard.';
            } catch (error) {
              showError('Could not copy image', error);
            } finally {
              copyButton.disabled = false;
            }
          });

          deleteButton.addEventListener('click', async () => {
            deleteButton.disabled = true;

            try {
              const response = await chrome.runtime.sendMessage({
                type: 'hydrogen.deleteScreenshot',
                id: screenshot.id
              });

              if (!response?.ok) {
                throw new Error(response?.error || 'Could not delete screenshot.');
              }

              item.remove();
              const remaining = grid.childElementCount;
              status.textContent = remaining
                ? remaining + (remaining === 1 ? ' screenshot' : ' screenshots')
                : 'No screenshots yet. Use your screenshot hotkey.';
            } catch (error) {
              deleteButton.disabled = false;
              showError('Could not delete screenshot', error);
            }
          });

          actions.append(copyButton, deleteButton);
          item.append(image, date, actions);
          grid.appendChild(item);
        });

        return true;
      } catch (error) {
        showError('Could not load screenshots', error);
        return false;
      }
    }

    return {
      root,
      refresh,
      setStatus(message) {
        status.textContent = message;
      }
    };
  };
})();
