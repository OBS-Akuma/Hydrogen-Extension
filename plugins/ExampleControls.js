(() => {
    'use strict';

    if (window.__HYDROGEN_EXAMPLE_CONTROLS__) return;
    window.__HYDROGEN_EXAMPLE_CONTROLS__ = true;

    const PLUGIN_ID = 'example-controls';

    function el(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function createExampleRow(titleText, descriptionText, control) {
        const row = el('div', 'sm-example-row');
        const heading = el('div', 'sm-example-heading');
        const title = el('div', 'sm-card-title', titleText);
        const description = el('div', 'sm-card-desc', descriptionText);

        heading.append(title, description);
        row.append(heading, control);

        return row;
    }

    function createSettings() {
        const card = el('div', 'sm-card sm-example-controls');
        card.dataset.hydrogenPlugin = PLUGIN_ID;

        const slider = document.createElement('input');
        slider.className = 'sm-example-slider';
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = '50';
        slider.setAttribute('aria-label', 'Example Slider');

        const select = document.createElement('select');
        select.className = 'sm-example-select';
        select.setAttribute('aria-label', 'Example Select');

        ['Option 1', 'Option 2', 'Option 3'].forEach(label => {
            const option = document.createElement('option');
            option.textContent = label;
            select.appendChild(option);
        });

        const input = document.createElement('input');
        input.className = 'sm-example-input';
        input.type = 'text';
        input.placeholder = 'Type here...';
        input.setAttribute('aria-label', 'Example Input');

        card.append(
            createExampleRow('Example Slider', 'Example of a slider', slider),
            createExampleRow('Example Select', 'Example of a select', select),
            createExampleRow('Example Input', 'Example of an input', input)
        );

        return card;
    }

    function addSettings() {
        const pluginsTab = document.getElementById('tab-plugins');

        if (!pluginsTab) return false;

        if (pluginsTab.querySelector(
            '[data-hydrogen-plugin="' + PLUGIN_ID + '"]'
        )) {
            return true;
        }

        pluginsTab.appendChild(createSettings());
        return true;
    }

    function start() {
        if (addSettings()) return;

        const observer = new MutationObserver(() => {
            if (addSettings()) observer.disconnect();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.documentElement) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
})();
