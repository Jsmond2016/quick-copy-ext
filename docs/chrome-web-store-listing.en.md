# Chrome Web Store Listing — Quick Copy Ext

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

### 2.2 Host Permissions Justification

| Permission | Justification |
|------------|---------------|
| **<all_urls>** | The extension needs to capture XHR requests on arbitrary domains as configured by the user for debugging purposes. <all_urls> is required because users can add any domain to their monitored origins list. By default, only `localhost` and `127.0.0.1` are monitored; users control which domains to include. |

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
7. No data is sent to any third-party service.
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
3. **Copy result** — showing the formatted feedback text pasted into an editor
4. **Apifox integration (optional)** — showing API names auto-linked from Apifox

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
- [ ] Version confirmed (current: 1.4.32)
- [ ] Functionality tested locally

### Build & Package

```bash
# Build Chrome version
pnpm build:chrome

# Package dist_chrome into ZIP
cd dist_chrome && zip -r ../quick-copy-ext-v1.4.32.zip . && cd ..
```
