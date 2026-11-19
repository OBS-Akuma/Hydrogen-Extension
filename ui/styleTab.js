
(function () {
  const el = window.SM.el;

  window.SM.buildStyleTab = function ({
    initialCss,
    initialSettings,
    tabId,
    tabLabel
  }) {
    const root = el('div', 'sm-tab-content sm-active');
    root.id = 'tab-' + tabId;

    const searchCard = el('div', 'sm-card');
    const searchHead = el('div', 'sm-card-head');

    searchHead.appendChild(el('div', 'sm-card-title', {
      textContent: 'CSS URL'
    }));

    searchHead.appendChild(el('div', 'sm-card-desc', {
      textContent: 'Load a stylesheet from a link'
    }));

    searchCard.appendChild(searchHead);

    const linkInput = el('input', 'sm-css-url-input', {
      type: 'text',
      placeholder: 'https://raw.githubusercontent.com/.../style.css'
    });

    linkInput.value = initialSettings?.cssUrl || '';
    linkInput.setAttribute('autocomplete', 'off');
    linkInput.spellcheck = false;

    const uploadedFiles = Array.isArray(initialSettings?.files)
      ? initialSettings.files.map(file => ({ ...file }))
      : [];

    const saveSettings = () => {
      window.SM.storage.saveStyleSettings({
        cssUrl: linkInput.value,
        files: uploadedFiles
      });
    };

    const applyLink = () => {
      window.SM.injector.scheduleLink(linkInput.value);
      saveSettings();
    };

    linkInput.addEventListener('input', applyLink);
    linkInput.addEventListener('change', applyLink);
    linkInput.addEventListener('paste', () => {
      setTimeout(applyLink, 100);
    });

    searchCard.appendChild(linkInput);
    root.appendChild(searchCard);

    const filesCard = el('div', 'sm-card');
    const filesHead = el('div', 'sm-card-head');

    const filesHeading = el('div', 'sm-card-title', {
      textContent: 'Upload CSS Files'
    });

    const filesActions = el('div', 'sm-css-file-actions');

    const fileCount = el('span', 'sm-css-file-count', {
      textContent: '0 files'
    });

    const clearButton = el('button', 'sm-plugin-button', {
      type: 'button',
      textContent: 'Clear'
    });

    filesActions.appendChild(fileCount);
    filesActions.appendChild(clearButton);

    filesHead.appendChild(filesHeading);
    filesHead.appendChild(filesActions);
    filesCard.appendChild(filesHead);

    const fileInput = el('input', 'sm-css-file-input', {
      type: 'file',
      accept: '.css,text/css'
    });

    fileInput.setAttribute('multiple', '');
    filesCard.appendChild(fileInput);

    const fileList = el('div', 'sm-css-file-list');
    filesCard.appendChild(fileList);

    function updateFileList() {
      fileList.innerHTML = '';

      uploadedFiles.forEach(file => {
        const item = el('div', 'sm-css-file-item');

        const details = el('details', 'sm-css-file-details');
        const summary = el('summary', 'sm-css-file-summary');

        const info = el('div', 'sm-css-file-info');

        info.appendChild(el('span', 'sm-css-file-name', {
          textContent: file.name
        }));

        info.appendChild(el('span', 'sm-css-file-size', {
          textContent: '(' + (file.size / 1024).toFixed(1) + ' KB)'
        }));

        summary.appendChild(info);

        const toggle = el('button', 'sm-css-file-toggle' + (file.enabled ? ' sm-enabled' : ' sm-disabled'), {
          type: 'button',
          textContent: file.enabled ? 'On' : 'Off'
        });

        toggle.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();

          file.enabled = !file.enabled;
          window.SM.injector.setFileEnabled(file.name, file.enabled);
          saveSettings();
          updateFileList();
        });

        summary.appendChild(toggle);

        const removeButton = el('button', 'sm-css-remove', {
          type: 'button',
          textContent: '×'
        });

        removeButton.title = 'Remove file';

        removeButton.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();

          window.SM.injector.removeFile(file.name);

          const index = uploadedFiles.indexOf(file);
          if (index !== -1) uploadedFiles.splice(index, 1);

          saveSettings();
          updateFileList();
        });

        summary.appendChild(removeButton);

        const editor = el('textarea', 'sm-css-file-editor', {
          spellcheck: false
        });

        editor.value = file.css;
        editor.placeholder = 'Edit this file’s CSS...';

        let editTimer = null;

        editor.addEventListener('input', () => {
          file.css = editor.value;
          saveSettings();

          clearTimeout(editTimer);
          editTimer = setTimeout(() => {
            window.SM.injector.updateFile(file.name, file.css);
          }, 300);
        });

        editor.addEventListener('change', () => {
          clearTimeout(editTimer);
          file.css = editor.value;
          window.SM.injector.updateFile(file.name, file.css);
          saveSettings();
        });

        details.appendChild(summary);
        details.appendChild(editor);

        item.appendChild(details);
        fileList.appendChild(item);
      });

      fileCount.textContent =
        uploadedFiles.length + ' ' +
        (uploadedFiles.length === 1 ? 'file' : 'files');
    }

    clearButton.addEventListener('click', () => {
      window.SM.injector.clearFiles();
      uploadedFiles.length = 0;
      saveSettings();
      updateFileList();
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);

      files.forEach(file => {
        if (!file.name.toLowerCase().endsWith('.css')) return;
        if (uploadedFiles.some(item => item.name === file.name)) return;

        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          if (uploadedFiles.some(item => item.name === file.name)) return;

          const uploadedFile = {
            name: file.name,
            size: file.size,
            css: reader.result,
            enabled: true
          };

          uploadedFiles.push(uploadedFile);

          window.SM.injector.addFile(
            uploadedFile.name,
            uploadedFile.css,
            uploadedFile.enabled
          );

          saveSettings();
          updateFileList();
        };

        reader.readAsText(file);
      });

      fileInput.value = '';
    });

    updateFileList();
    root.appendChild(filesCard);

    const rawCard = el('div', 'sm-card');
    const rawHead = el('div', 'sm-card-head');

    rawHead.appendChild(el('div', 'sm-card-title', {
      textContent: 'Raw CSS'
    }));

    rawHead.appendChild(el('div', 'sm-card-desc', {
      textContent: 'Paste CSS here, it applies automatically'
    }));

    rawCard.appendChild(rawHead);

    const ta = el('textarea', 'sm-textarea', {
      placeholder: `#logo {
  content: url("https://raw.githubusercontent.com/OBS-Akuma/Ubuntu-client/refs/heads/main/assets/hyd_logo.png");
  object-fit: contain;
}`,
      spellcheck: false
    });

    ta.value = initialCss || '';
    rawCard.appendChild(ta);
    root.appendChild(rawCard);

    const persist = () => {
      window.SM.injector.schedule(ta.value);
      window.SM.storage.saveCss(ta.value);
    };

    ta.addEventListener('input', persist);

    ta.addEventListener('change', () => {
      window.SM.injector.flush(ta.value);
      window.SM.storage.saveCss(ta.value);
    });

    window.SM.searchIndex.push({
      id: tabId,
      label: tabLabel,
      title: 'CSS',
      desc: 'CSS URL, upload CSS files, or paste custom CSS',
      item: searchCard
    });

    return { root, textarea: ta };
  };
})();
