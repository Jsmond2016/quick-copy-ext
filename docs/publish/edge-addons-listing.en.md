# Microsoft Edge Add-ons Listing — Quick Copy Ext

## 1. Basic Info

| Field | Value |
|-------|-------|
| **Name** | Quick Copy Ext |
| **Short description** | Capture abnormal API requests from the current page and copy standardized bug report content with one click. |
| **Long description** | Quick Copy Ext is a browser extension for web developers and testers, designed to reduce communication overhead when reporting bugs. |

### Long Description (ready to copy)

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
| **Category** | Developer Tools |

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
| **activeTab** | Reads the active tab's URL and page title for inclusion in the feedback content. Only activated when the user clicks the extension icon. |
| **tabs** | Listens for tab URL changes (e.g., SPA route changes) to re-evaluate monitoring state; cleans up cached request records when a tab is closed; enumerates all tabs on startup to establish monitored origins. |
| **webRequest** | Observes XHR request initiation, completion, and error events on the page. Captures request URL, HTTP method, status code, request headers (for traceId extraction), and timing. Does NOT read or modify request bodies or response content. |
| **storage** | Uses `storage.sync` to persist user settings (monitoring rules, API prefix filters, custom fields, etc.). Uses `storage.session` to cache request records and Apifox data during the browser session. |

### 2.2 Host Permissions Justification

| Permission | Justification |
|------------|---------------|
| **<all_urls>** | The extension needs to capture XHR requests on arbitrary domains as configured by the user. <all_urls> is required to support user-configurable monitoring origins. By default, only `localhost` and `127.0.0.1` are monitored; users control which domains to add. |

### 2.3 Content Script

The extension injects a content script into all pages, which injects `page-network-hook.js` to capture response body data for business-rule anomaly detection. See "Data Usage" below.

### 2.4 Data Usage

Fill the "Data Usage" section with the following:

```
Data Collection & Usage:

1. This extension does NOT collect, upload, or share any user data to remote servers.
2. All data (including API request records, URLs, page titles, response body snapshots) is processed locally in the browser and never leaves the user's device.
3. User settings are persisted via chrome.storage.sync, used only to sync configuration across Edge browsers logged into the same Microsoft account.
4. The extension does NOT read or store browsing history, bookmarks, passwords, or other personal information.
5. The extension only reads the current tab's information when the user clicks the extension icon to open the popup.
6. Response body snapshots are used solely for business-rule anomaly detection (e.g., res.rtn !== 0). Snapshots are truncated (max 20 keys, 3 levels deep, strings capped at 300 characters).
7. No data is sent to any third-party service.
```

### 2.5 Edge-specific APIs

The extension uses standard Manifest V3 APIs that are fully compatible with Microsoft Edge. No Edge-specific API is required.

---

## 3. Image Assets

### Extension Icon

| Asset | Size | File |
|-------|------|------|
| **App Icon** | 128x128 PNG | `public/icon-128.png` |
| **Small Icon** | 32x32 PNG | `public/icon-32.png` |

### Screenshots

Edge Add-ons requires at least 1 screenshot. Recommended: 3–5.

Suggested screenshots:
1. **Popup main panel** — showing the API request list with checkboxes and filters
2. **Settings page** — showing monitoring domains and API prefix filter configuration
3. **Copy result** — showing the formatted feedback text pasted into an editor
4. **Apifox integration (optional)** — showing API names auto-linked from Apifox

Requirements:
- Format: PNG or JPEG
- Min size: 640x400
- Recommended size: 1280x800
- Screenshots should display the Simplified Chinese UI

### Promotional Tiles (optional)

| Asset | Size |
|-------|------|
| **Promo Tile** | 1400x560 PNG |
| **Small Promo Tile** | 440x280 PNG |

---

## 4. Availability

### Search Engine Optimization

| Field | Value |
|-------|-------|
| **Search Terms** | `api` `debug` `bug report` `copy` `frontend` `testing` `ajax` `xhr` `request` `network` `feedback` |

### Publishing Options

| Field | Value |
|-------|-------|
| **Pricing** | Free |
| **Visibility** | Public |
| **Distribution** | All regions |

### Age Rating

| Field | Value |
|-------|-------|
| **Age Rating** | Rated 3+ |

---

## 5. Certification Info

### Publisher Verification

Edge Add-ons requires a Microsoft account registered as a developer:
- Developer registration: https://partner.microsoft.com/
- You'll need to set up a publisher profile (name, email, etc.)

### Package Upload

- Upload a ZIP archive containing the extension
- The ZIP must contain `manifest.json` at the root
- Manifest version: 3

### Build & Package

```bash
# Build (same build as Chrome version)
pnpm build:chrome

# Package into ZIP
cd dist_chrome && zip -r ../quick-copy-ext-v1.4.32-edge.zip . && cd ..
```

> **Note**: Edge Add-ons accepts Chrome-compatible extension packages. The Chrome build output (`dist_chrome/`) can be used directly without modification.

---

## 6. Edge vs Chrome Publishing Comparison

| Item | Chrome Web Store | Edge Add-ons |
|------|------------------|-------------|
| Developer Fee | $5 one-time | Free |
| Review Time | Typically hours–1 day | Typically 1–2 business days |
| Build Artifact | Same (`dist_chrome/`) | Same (`dist_chrome/`) |
| Permission Justification | Required for each permission | Required for each permission |
| Update Mechanism | Auto-update | Auto-update |

---

## 7. Pre-publish Checklist

- [ ] 128x128 extension icon ready
- [ ] At least 1 screenshot prepared
- [ ] Long description filled
- [ ] Category set to "Developer Tools"
- [ ] Search terms configured
- [ ] Permission justifications filled for every permission
- [ ] Data usage/privacy description completed
- [ ] ZIP package packaged
- [ ] Publisher profile set up
- [ ] Extension tested locally in Edge browser
