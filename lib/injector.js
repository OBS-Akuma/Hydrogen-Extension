
(function () {
  let styleEl = null;
  let linkStyleEl = null;
  let timer = null;
  let linkTimer = null;
  let linkRequest = 0;

  const fileStyles = new Map();

  function getStyleParent() {
    return document.head || document.documentElement;
  }

  function ensureStyle() {
    if (styleEl && styleEl.isConnected) return styleEl;

    styleEl = document.createElement('style');
    styleEl.dataset.styleMenu = 'true';
    getStyleParent().appendChild(styleEl);

    return styleEl;
  }

  function ensureLinkStyle() {
    if (linkStyleEl && linkStyleEl.isConnected) return linkStyleEl;

    linkStyleEl = document.createElement('style');
    linkStyleEl.dataset.styleMenuLink = 'true';
    getStyleParent().appendChild(linkStyleEl);

    return linkStyleEl;
  }

  function applyLink(url) {
    const requestId = ++linkRequest;
    const value = String(url || '').trim();

    if (!value) {
      if (linkStyleEl) linkStyleEl.remove();
      linkStyleEl = null;
      return Promise.resolve();
    }

    let parsed;

    try {
      parsed = new URL(value);
    } catch (_) {
      return Promise.reject(new Error('Invalid CSS URL'));
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return Promise.reject(new Error('Invalid CSS URL'));
    }

    return fetch(parsed.href)
      .then(response => {
        if (!response.ok) throw new Error('Unable to load CSS');
        return response.text();
      })
      .then(css => {
        if (requestId !== linkRequest) return;
        ensureLinkStyle().textContent = css;
      });
  }

  function applyFile(name) {
    const file = fileStyles.get(name);
    if (!file) return;

    if (!file.enabled) {
      if (file.style) {
        file.style.remove();
        file.style = null;
      }
      return;
    }

    if (!file.style || !file.style.isConnected) {
      file.style = document.createElement('style');
      file.style.dataset.styleMenuFile = name;
      getStyleParent().appendChild(file.style);
    }

    file.style.textContent = file.css;
  }

  function addFile(name, css, enabled = true) {
    if (!name || typeof css !== 'string') return;

    const existing = fileStyles.get(name);

    if (existing) {
      existing.css = css;
      existing.enabled = enabled;
    } else {
      fileStyles.set(name, {
        css,
        enabled,
        style: null
      });
    }

    applyFile(name);
  }

  function updateFile(name, css) {
    const file = fileStyles.get(name);
    if (!file || typeof css !== 'string') return;

    file.css = css;
    applyFile(name);
  }

  function setFileEnabled(name, enabled) {
    const file = fileStyles.get(name);
    if (!file) return;

    file.enabled = Boolean(enabled);
    applyFile(name);
  }

  function removeFile(name) {
    const file = fileStyles.get(name);

    if (file?.style) {
      file.style.remove();
    }

    fileStyles.delete(name);
  }

  function clearFiles() {
    fileStyles.forEach(file => {
      if (file.style) file.style.remove();
    });

    fileStyles.clear();
  }

  window.SM.injector = {
    apply(css) {
      ensureStyle().textContent = css || '';
    },

    schedule(css, delay = 300) {
      clearTimeout(timer);

      timer = setTimeout(() => {
        window.SM.injector.apply(css);
      }, delay);
    },

    flush(css) {
      clearTimeout(timer);
      window.SM.injector.apply(css);
    },

    applyLink,

    scheduleLink(url, delay = 300) {
      clearTimeout(linkTimer);

      linkTimer = setTimeout(() => {
        applyLink(url).catch(() => {});
      }, delay);
    },

    addFile,
    updateFile,
    setFileEnabled,
    removeFile,
    clearFiles
  };

  window.SM.storage.ready.then(() => {
    const savedCss = window.SM.storage.loadCss();

    if (savedCss) {
      window.SM.injector.apply(savedCss);
    }

    const settings = window.SM.storage.loadStyleSettings();

    if (settings.cssUrl) {
      applyLink(settings.cssUrl).catch(() => {});
    }

    settings.files.forEach(file => {
      addFile(file.name, file.css, file.enabled);
    });
  });
})();
