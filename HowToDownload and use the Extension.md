# How to Download and Use the Hydrogen Extension

## Download

1. Open the [Hydrogen Extension repository](https://github.com/OBS-Akuma/Hydrogen-Extension).
2. Select **Code**, then **Download ZIP**.
3. Extract the downloaded ZIP file. Keep the extracted folder somewhere you will not accidentally delete; the browser loads the extension from that folder.

## Install in Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted Hydrogen Extension folder that contains `manifest.json`.
5. Confirm that Hydrogen appears in the extensions list and is enabled.

## Install in Microsoft Edge

1. Open `edge://extensions` in Edge.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extracted Hydrogen Extension folder that contains `manifest.json`.
5. Confirm that Hydrogen appears in the extensions list and is enabled.

Other Chromium-based browsers may offer a similar developer-mode option for loading an unpacked extension.

## Use the extension

1. Open or reload one of the supported sites:
   - [snipers.io](https://snipers.io)
   - [ask101math.com](https://ask101math.com)
   - [fpsiogame.com](https://fpsiogame.com)
   - [cloudconverts.com](https://cloudconverts.com)
2. Press the **Right Shift** key to open or close the Hydrogen menu. Press **Escape** to close it.
3. Use the menu tabs to adjust the available styles, plugins, and client settings. Changes are saved by the extension.

The extension does not open a popup from the browser toolbar; its menu is displayed on supported websites.

## Update or remove

- **Automatic updates:** Once Hydrogen is published in the Chrome Web Store or Microsoft Edge Add-ons, install it from the relevant store. The browser will automatically update the complete extension when a newer store version is published.
- **Current GitHub installation:** An unpacked extension cannot update or replace its own files. GitHub's **Source code (zip)** is not an installable browser update; download and extract a newer ZIP, then use **Load unpacked** to select its folder. If the browser has the old folder loaded, load the new one and remove the old entry from the extensions page.
- **Release publishing:** Increase the `version` in `manifest.json` for each release and submit the complete extension package to each store. Store publication and automatic updates are not configured by this repository yet.
- **Remove:** Open the browser's extensions page, find Hydrogen, and select **Remove**.
