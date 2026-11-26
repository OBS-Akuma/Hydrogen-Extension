
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

    const interfaceCard = el('div', 'sm-card sm-example-controls');
    const initialBounds = initialSettings?.interface_bounds;
    const initialScaleValue = initialBounds === '0'
      ? '80'
      : initialBounds === '1'
        ? '90'
        : /^(?:100|(?:8[0-9]|9[0-9]))$/.test(String(initialBounds))
          ? String(initialBounds)
          : '100';
    const scaleInput = el('input', 'sm-example-slider', {
      type: 'range',
      min: '80',
      max: '100',
      step: '1',
      value: initialScaleValue
    });
    scaleInput.classList.add('sm-interface-scale-slider');
    scaleInput.setAttribute('aria-label', 'Interface Scale');

    const scaleValueInput = el('input', 'sm-interface-value', {
      type: 'number',
      min: '80',
      max: '100',
      step: '1',
      value: initialScaleValue
    });
    scaleValueInput.setAttribute('aria-label', 'Interface Scale value (%)');

    const savedOpacity = String(initialSettings?.interface_opacity ?? '');
    const opacityValue =
      /^(?:100|[0-9]{1,2})$/.test(savedOpacity)
        ? String(Number(savedOpacity))
        : '100';
    const opacityInput = el('input', 'sm-example-slider', {
      type: 'range',
      min: '0',
      max: '100',
      step: '1',
      value: opacityValue
    });
    opacityInput.classList.add('sm-interface-opacity-slider');
    opacityInput.setAttribute('aria-label', 'Interface Opacity');

    const opacityValueInput = el('input', 'sm-interface-value', {
      type: 'number',
      min: '0',
      max: '100',
      step: '1',
      value: opacityValue
    });
    opacityValueInput.setAttribute('aria-label', 'Interface Opacity value (%)');

    function createInterfaceControl(
      slider,
      valueInput,
      label,
      stops,
      formatStop
    ) {
      const control = el('div', 'sm-interface-control');
      const sliderWrap = el('div', 'sm-interface-slider-wrap');
      const labels = el('div', 'sm-slider-labels');
      const stopLabels = stops.map(value => {
        const stopLabel = el('span', 'sm-slider-label', {
          textContent: formatStop(value)
        });
        stopLabel.dataset.value = String(value);
        labels.appendChild(stopLabel);
        return stopLabel;
      });

      const updateStopLabels = () => {
        stopLabels.forEach(stopLabel => {
          stopLabel.classList.toggle(
            'sm-label-active',
            Number(slider.value) === Number(stopLabel.dataset.value)
          );
        });
      };

      sliderWrap.append(slider, labels);
      const valueGroup = el('div', 'sm-interface-value-group');
      const stepper = el('div', 'sm-interface-stepper');
      const stepButtons = [];

      valueGroup.append(valueInput);

      [
        { direction: 1, action: 'Increase', path: 'M3 7.5 6 4.5l3 3' },
        { direction: -1, action: 'Decrease', path: 'M3 4.5 6 7.5l3-3' }
      ].forEach(({ direction, action, path }) => {
        const buttonLabel = action + ' ' + label;
        const button = el('button', 'sm-interface-step', {
          type: 'button',
          title: buttonLabel
        });
        button.setAttribute('aria-label', buttonLabel);

        const icon = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );
        icon.setAttribute('viewBox', '0 0 12 12');
        icon.setAttribute('aria-hidden', 'true');

        const arrow = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        );
        arrow.setAttribute('d', path);
        icon.appendChild(arrow);
        button.appendChild(icon);
        stepper.appendChild(button);
        stepButtons.push({ button, direction });
      });

      valueGroup.appendChild(stepper);
      control.append(
        sliderWrap,
        valueGroup,
        el('span', 'sm-interface-unit', '%')
      );

      return { root: control, stepButtons, updateStopLabels };
    }

    function createInterfaceRow(settingId, titleText, descriptionText, control) {
      const row = el('div', 'sm-example-row');
      row.dataset.hydrogenSetting = settingId;
      const heading = el('div', 'sm-example-heading');

      heading.append(
        el('div', 'sm-card-title', { textContent: titleText }),
        el('div', 'sm-card-desc', { textContent: descriptionText })
      );
      row.append(heading, control);

      return row;
    }

    const scaleControl = createInterfaceControl(
      scaleInput,
      scaleValueInput,
      'Interface Scale',
      [80, 90, 100],
      value => value + '%'
    );
    const opacityControl = createInterfaceControl(
      opacityInput,
      opacityValueInput,
      'Interface Opacity',
      [0, 25, 50, 75, 100],
      value => value + '%'
    );

    interfaceCard.append(
      createInterfaceRow(
        'interface-scale',
        'Interface Scale',
        'Shrink the in-game HUD and interface',
        scaleControl.root
      ),
      createInterfaceRow(
        'interface-opacity',
        'Interface Opacity',
        'Fade the in-game HUD',
        opacityControl.root
      )
    );

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

    function getInterfaceSettings() {
      const currentSettings = window.SM.storage.loadStyleSettings();

      return {
        interface_bounds: scaleInput.value === '100'
          ? ''
          : scaleInput.value,
        interface_opacity: opacityInput.value,
        background_opacity: currentSettings.background_opacity,
        menu_width: currentSettings.menu_width,
        menu_height: currentSettings.menu_height,
        card_opacity: currentSettings.card_opacity,
        accent_color: currentSettings.accent_color,
        surface_color: currentSettings.surface_color,
        border_radius: currentSettings.border_radius,
        sidebar_labels: currentSettings.sidebar_labels
      };
    }

    const saveSettings = () => {
      window.SM.storage.saveStyleSettings({
        cssUrl: linkInput.value,
        files: uploadedFiles,
        ...getInterfaceSettings()
      });
    };

    const applyInterfaceSettings = () => {
      window.SM.injector.applyInterfaceSettings(getInterfaceSettings());
    };

    function bindSlider(
      slider,
      valueInput,
      min,
      max,
      stepButtons,
      stops,
      updateStopLabels
    ) {
      const updateStopHighlight = () => {
        slider.classList.toggle(
          'sm-at-stop',
          stops.includes(Number(slider.value))
        );
      };

      const updateStepper = () => {
        const value = Number(slider.value);

        updateStopHighlight();
        updateStopLabels();

        stepButtons.forEach(({ button, direction }) => {
          button.disabled = direction > 0 ? value >= max : value <= min;
        });
      };

      const updateFromSlider = () => {
        valueInput.value = slider.value;
        updateStepper();
        applyInterfaceSettings();
      };

      slider.addEventListener('input', updateFromSlider);
      slider.addEventListener('change', () => {
        updateFromSlider();
        saveSettings();
      });

      valueInput.addEventListener('input', () => {
        const value = Number(valueInput.value);

        if (
          valueInput.value === '' ||
          !Number.isInteger(value) ||
          value < min ||
          value > max
        ) {
          return;
        }

        slider.value = String(value);
        updateStepper();
        applyInterfaceSettings();
      });

      valueInput.addEventListener('change', () => {
        const value = Number(valueInput.value);
        const valid = valueInput.value !== '' &&
          Number.isInteger(value) &&
          value >= min &&
          value <= max;

        if (!valid) {
          valueInput.value = slider.value;
        } else {
          slider.value = String(value);
        }

        updateStepper();
        applyInterfaceSettings();
        saveSettings();
      });

      stepButtons.forEach(({ button, direction }) => {
        button.addEventListener('click', () => {
          const value = Number(slider.value);
          const nextValue = Math.max(min, Math.min(max, value + direction));

          if (nextValue === value) return;

          slider.value = String(nextValue);
          valueInput.value = slider.value;
          updateStepper();
          applyInterfaceSettings();
          saveSettings();
        });
      });

      updateStepper();
    }

    bindSlider(
      scaleInput,
      scaleValueInput,
      80,
      100,
      scaleControl.stepButtons,
      [80, 90, 100],
      scaleControl.updateStopLabels
    );
    bindSlider(
      opacityInput,
      opacityValueInput,
      0,
      100,
      opacityControl.stepButtons,
      [0, 25, 50, 75, 100],
      opacityControl.updateStopLabels
    );

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

    const rawDetails = el('details', 'sm-raw-css-details');
    const rawHead = el('summary', 'sm-card-head sm-raw-css-summary');
    rawHead.append(
      el('span', 'sm-card-title', { textContent: 'Raw CSS' }),
      el('span', 'sm-card-desc', {
        textContent: 'Paste CSS here, it applies automatically'
      })
    );
    rawDetails.appendChild(rawHead);

    const ta = el('textarea', 'sm-textarea', {
      placeholder: `#logo {
  content: url("https://raw.githubusercontent.com/OBS-Akuma/Ubuntu-client/refs/heads/main/assets/hyd_logo.png");
  object-fit: contain;
}`,
      spellcheck: false
    });

    ta.value = initialCss || '';
    rawDetails.appendChild(ta);
    searchCard.appendChild(rawDetails);
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
    root.appendChild(interfaceCard);

    const persist = () => {
      window.SM.injector.schedule(ta.value);
      window.SM.storage.saveCss(ta.value);
    };

    ta.addEventListener('input', persist);

    ta.addEventListener('change', () => {
      window.SM.injector.flush(ta.value);
      window.SM.storage.saveCss(ta.value);
    });

    window.SM.searchIndex.push(
      {
        id: 'css-url',
        label: tabLabel,
        title: 'CSS URL',
        desc: 'Load a stylesheet from a link',
        item: searchCard
      },
      {
        id: 'upload-css-files',
        label: tabLabel,
        title: 'Upload CSS Files',
        desc: 'Choose, manage, or remove uploaded CSS files',
        item: filesCard
      },
      {
        id: 'raw-css',
        label: tabLabel,
        title: 'Raw CSS',
        desc: 'Type or paste custom CSS directly',
        item: rawDetails
      }
    );

    return { root, textarea: ta };
  };
})();
