# Chrome Web Store Listing — Quick Copy Ext

> **Updated**: 2026-07-24; **Model**: GPT-5 Codex; **User**: Jsmond2016

---

## 1. Basic Info

| Field | Value |
|-------|-------|
| **Extension Name** | Quick Copy Ext |
| **Short Description** | Capture abnormal API requests from the current page and copy standardized bug report content with one click. |
| **Detailed Description** | Quick Copy Ext is a browser extension for web developers and testers, designed to reduce communication overhead when reporting bugs. |

### Detailed Description (ready to copy)

```
Quick Copy Ext is a browser extension for web developers and testers, designed to reduce communication overhead when reporting bugs.

Features:

• Auto-capture API requests — listens to XHR requests on the current page and automatically collects URL, method, status code, request/response headers, traceId, and timing.
• Smart filtering & selection — filter requests by API path prefix; select individual requests or hold Shift for range selection.
• One-click standardized copy — formats selected API info, page URL, page title into structured text and copies to clipboard.
• Response rule anomaly detection — define custom response evaluation rules (e.g. res.rtn !== 0) to auto-detect business logic errors.
• Apifox integration — connect to a local Apifox export server to auto-link API documentation URLs and API names.
• Screenshot annotation and copy — capture the current page, annotate it, and write the annotated PNG image to the system clipboard.
• Current tab/window recording — record the user-triggered current tab or current window and save the result as a local WebM file.
• Custom fields — add extra fields (e.g. "Reporter: John") that will be included in the copied feedback.
• Quick-fill templates — preset common feedback templates for fast note entry.
• Import/export settings — monitoring rules and filter configs can be exported/imported as JSON for team sharing.

Use cases:

• Testers filing bugs — quickly attach full API request details.
• Frontend-backend debugging — share captured request records for cross-team verification.
• Daily development — copy a set of API request details for discussion or analysis.
```

### Category

| Field | Value |
|-------|-------|
| **Primary category** | Developer Tools |
| **Secondary category** | (optional) Productivity |

### Language

| Field | Value |
|-------|-------|
| **UI Language** | Simplified Chinese (zh-CN) |
| **Supported Languages** | zh-CN |

---

## 2. Privacy & Permissions

### 2.1 Permission Justifications

| Permission | Justification |
|------------|---------------|
| **activeTab** | Used to read the active tab's URL and page title for inclusion in the feedback content. Only activated when the user clicks the extension icon. Does NOT read all tabs in the background. |
| **tabs** | Used to listen for tab URL changes (e.g., SPA route transitions) in order to re-evaluate whether to capture requests; clean up cached request records when a tab is closed; enumerate all tabs on startup to establish monitored origins. |
| **webRequest** | Used to observe XHR request initiation, completion, and error events on the page. Captures request URL, HTTP method, status code, request headers (including traceId), and timing for debugging purposes. Does NOT read or modify request or response bodies. |
| **storage** | Uses `storage.sync` to persist user settings (monitoring rules, API prefix filters, custom fields, Apifox export URL, etc.). Uses `storage.session` to cache request records and Apifox data in-memory during the browser session, so they survive Service Worker restarts. |
| **clipboardWrite** | Writes generated feedback text or annotated PNG screenshots to the system clipboard only after the user clicks copy or completes screenshot annotation. The extension does not request `clipboardRead` and never reads clipboard contents. |
| **downloads** | Saves the generated WebM recording file to the browser downloads folder after the user actively stops a recording, and lets the user open the latest saved recording from the extension. It does not read, scan, or upload local files. |
| **contextMenus** | Adds Quick Copy actions to the page context menu, including screenshot, start recording, pause, resume, stop, and save. Each action is triggered only by an explicit user click. |
| **desktopCapture** | Opens the browser-provided source picker when the user chooses "record window" and captures only the window or screen source selected by the user. It does not record desktop content silently. |
| **offscreen** | Uses a Manifest V3 offscreen document during recording to host `MediaRecorder` and temporary Blob handling because the service worker and popup are not suitable for long-running media work. Resources are released after saving completes. |
| **scripting** | Injects bundled extension scripts into supported pages when needed to open the screenshot editor, show the recording status overlay, or restore a disconnected content-script channel. It does not load or execute remote code. |
| **tabCapture** | Captures the current tab's video stream only after the user clicks the tab recording button or context menu item. Audio is disabled by default, and the generated recording remains local. |
| **unlimitedStorage** | Stores the latest high-quality recording preview locally in the browser so it is not removed because of ordinary storage quota limits. The data stays on the user's device and is not uploaded or shared. |

#### Copy-ready Chrome Web Store Permission Justifications

```text
activeTab:
Used after the user clicks the extension icon, keyboard shortcut, or context menu action to read the active tab URL/title and capture the visible area for screenshots. The permission is temporary and user-triggered; the extension does not continuously access all tabs in the background.

tabs:
Used to listen for tab URL changes and tab close events, so the extension can re-evaluate monitored origins after SPA route changes and clean up request records, recording state, and screenshot sessions when a tab closes. It does not read or store browsing history.

webRequest:
Used to observe XHR request start, completion, and error events on the page, capturing URL, HTTP method, status code, traceId from request headers, response headers, and timing to help developers and testers generate API bug reports. It does not modify network requests and does not use webRequest to read request bodies or response bodies.

storage:
Used to save user settings and local session data. storage.sync stores monitored origins, API prefix filters, custom fields, and the Apifox export URL. storage.session caches request records, Apifox match results, and recording state during the current browser session. Data is used only in browser local/sync storage and is not uploaded to an extension server.

clipboardWrite:
Used when the user clicks a copy button or finishes screenshot annotation to write generated feedback text or the annotated PNG image to the system clipboard. The extension does not request clipboardRead and never reads clipboard contents.

downloads:
Used after the user actively stops a current tab or current window recording to save the generated WebM file to the browser downloads folder, and to open the latest saved recording from the extension. The extension does not read, scan, or upload local files.

contextMenus:
Used to show Quick Copy screenshot and recording controls in the page context menu, including start recording, pause, resume, stop and save, and screenshot annotation. All actions require an explicit user click on a menu item.

desktopCapture:
Used for the "record window" feature. Only after the user starts window recording, the extension opens the browser's window/screen picker and records only the source explicitly selected by the user. It does not silently record the desktop or other applications.

offscreen:
Used during recording to create a Manifest V3 offscreen document that hosts MediaRecorder, Blob generation, and temporary processing before local save. After recording is saved, the Blob URL is released and the offscreen document is closed.

scripting:
Used to inject bundled extension scripts into the current supported page when needed to open the screenshot annotation editor or restore recording status UI. All injected scripts are packaged with the extension; no remote code is loaded, injected, or executed.

tabCapture:
Used for the "record current page" feature. Only after the user clicks the recording button or context menu action, the extension captures the current tab video stream and generates a local WebM file. Audio is disabled by default and recording files are not uploaded to remote servers.

unlimitedStorage:
Used to keep the latest high-quality recording preview in local browser storage so it is not lost because of ordinary storage quota limits. This data stays on the user's device, can be cleared by the user, and is not uploaded or shared.
```

### 2.2 Host Permissions Justification

| Permission | Justification |
|------------|---------------|
| **`<all_urls>`** | The extension needs to capture XHR requests on arbitrary domains as configured by the user for debugging purposes. `<all_urls>` is required because users can add any domain to their monitored origins list. By default, only `localhost` and `127.0.0.1` are monitored; users control which domains to include. |

#### Copy-ready Host Permission Justification

```text
<all_urls>:
Quick Copy Ext is built for web development and testing workflows where users may need to temporarily capture XHR request records on any development, staging, pre-production, or production domain. The <all_urls> host permission is required to support user-configurable monitored origins. By default, the extension only monitors localhost and 127.0.0.1; any other domain must be added by the user in settings. The extension records request debugging information only for configured matching domains and does not indiscriminately collect data from all websites.
```

### 2.3 Content Script

The extension injects a content script into all pages, which in turn injects a page-level script (`page-network-hook.js`) to capture response body data for anomaly detection. See "Data Usage" below.

### 2.4 Data Usage

Fill the "Privacy" section with the following:

```
Data Collection & Usage:

1. This extension does NOT collect, upload, or share any user data to remote servers.
2. All data (including API request records, URLs, page titles, response body snapshots) is processed locally in the browser and never leaves the user's device.
3. User settings are persisted via chrome.storage.sync, used only to sync configuration across Chrome browsers logged into the same Google account.
4. The extension does NOT read or store browsing history, bookmarks, passwords, or other personal information.
5. The extension only reads the current tab's information when the user clicks the extension icon to open the popup panel.
6. Response body snapshots are used solely for business-rule anomaly detection (e.g., res.rtn !== 0). Snapshots are truncated (max 20 keys, 3 levels deep, strings capped at 300 characters).
7. Clipboard writing occurs only after the user clicks copy or completes screenshot annotation. The extension does not read clipboard contents.
8. Recording files are generated only after the user actively starts and stops a recording, then saved to the user's browser downloads folder. The latest recording preview is stored only in local browser storage.
9. No data is sent to any third-party service.
```

### 2.5 Remote Code

This extension does NOT execute any remote code. All code is bundled in the extension package.

---

## 3. Image Assets

### Store Icon

| Asset | Size | File |
|-------|------|------|
| **Extension Icon (128x128)** | 128x128 PNG | `public/icon-128.png` |
| **Extension Icon (32x32)** | 32x32 PNG | `public/icon-32.png` |

### Screenshots

Minimum: 1 screenshot. Recommended: 3–5 screenshots at 1280x800 or 640x400.

Suggested screenshots:
1. **Main popup** — showing the request list panel with API records
2. **Settings page** — showing monitoring domain config and API prefix filters
3. **Screenshot annotation** — showing the current page screenshot, annotation tools, and clipboard copy result
4. **Recording save** — showing the current tab/window recording state and saved WebM file notice
5. **Copy result** — showing the formatted feedback text pasted into an editor
6. **Apifox integration (optional)** — showing API names auto-linked from Apifox

Requirements:
- Format: PNG or JPEG
- Min size: 640x400
- Max size: 1280x800
- No borders, no rounded corners

### Promotional Images (optional)

| Asset | Size |
|-------|------|
| **Marquee Promo** | 1400x560 PNG |
| **Small Promo** | 440x280 PNG |

---

## 4. Other Info

| Field | Value |
|-------|-------|
| **Homepage URL** | https://github.com/Jsmond2016/quick-copy-ext |
| **Privacy Policy** | (optional — use GitHub repo URL or add PRIVACY.md) |
| **Support Email** | (developer email address) |
| **Developer Website** | (optional) |

### Distribution Region

All regions (default).

### Age Rating

Rated for everyone.

---

## 5. Pre-publish Checklist

- [ ] 128x128 extension icon ready
- [ ] At least 1 screenshot (1280x800) prepared
- [ ] Detailed description filled (in English or Chinese)
- [ ] Category set to "Developer Tools"
- [ ] Permission justifications filled for every permission
- [ ] Privacy description completed ("no data collection")
- [ ] ZIP package prepared (from `dist_chrome/`)
- [ ] Version confirmed (current: 1.4.53)
- [ ] Functionality tested locally

### Build & Package

```bash
# Build Chrome version
pnpm build:chrome

# Package dist_chrome into ZIP
cd dist_chrome && zip -r ../quick-copy-ext_1.4.53.zip . && cd ..
```
