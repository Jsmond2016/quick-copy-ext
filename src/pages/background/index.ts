import {
  ApifoxCacheStatus,
  buildApifoxLookupMaps,
  getApifoxLookupKey,
  getUrlPath,
  loadSettings,
  MAX_REQUESTS_PER_TAB,
  matchesMonitoredOrigins,
  NetworkRequestRecord,
  QuickCopySettings,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
  SETTINGS_STORAGE_KEY,
  normalizeHeaders,
} from '@src/lib/quick-copy';

const requestsByTab = new Map<number, NetworkRequestRecord[]>();
const requestIndex = new Map<string, NetworkRequestRecord>();
const tabUrlMap = new Map<number, string>();
const TRACKED_RESOURCE_TYPES = new Set(['xmlhttprequest']);
const apifoxEndpointMap = new Map<string, string>();
const apifoxPathMap = new Map<string, string>();
const APIFOX_SESSION_CACHE_KEY = 'quick-copy-apifox-session-cache';
const defaultApifoxStatus: ApifoxCacheStatus = {
  ready: false,
  sourceUrl: '',
  endpointCount: 0,
};

interface SerializedApifoxCache {
  status: ApifoxCacheStatus;
  endpointEntries: [string, string][];
  pathEntries: [string, string][];
}

let apifoxStatus: ApifoxCacheStatus = defaultApifoxStatus;
let monitoredOrigins: QuickCopySettings['monitoredOrigins'] = [];

async function persistApifoxCache() {
  const payload: SerializedApifoxCache = {
    status: apifoxStatus,
    endpointEntries: Array.from(apifoxEndpointMap.entries()),
    pathEntries: Array.from(apifoxPathMap.entries()),
  };

  await chrome.storage.session.set({
    [APIFOX_SESSION_CACHE_KEY]: payload,
  });
}

async function hydrateApifoxCache() {
  const stored = await chrome.storage.session.get(APIFOX_SESSION_CACHE_KEY);
  const payload = stored[APIFOX_SESSION_CACHE_KEY] as SerializedApifoxCache | undefined;

  if (!payload || typeof payload !== 'object') {
    return;
  }

  apifoxEndpointMap.clear();
  apifoxPathMap.clear();

  payload.endpointEntries?.forEach(([lookupKey, apifoxUrl]) => {
    if (typeof lookupKey === 'string' && typeof apifoxUrl === 'string') {
      apifoxEndpointMap.set(lookupKey, apifoxUrl);
    }
  });

  payload.pathEntries?.forEach(([path, apifoxUrl]) => {
    if (typeof path === 'string' && typeof apifoxUrl === 'string') {
      apifoxPathMap.set(path, apifoxUrl);
    }
  });

  apifoxStatus =
    payload.status && typeof payload.status === 'object'
      ? {
          ready: Boolean(payload.status.ready),
          sourceUrl: typeof payload.status.sourceUrl === 'string' ? payload.status.sourceUrl : '',
          endpointCount:
            typeof payload.status.endpointCount === 'number' ? payload.status.endpointCount : 0,
          updatedAt:
            typeof payload.status.updatedAt === 'number' ? payload.status.updatedAt : undefined,
          error: typeof payload.status.error === 'string' ? payload.status.error : undefined,
        }
      : defaultApifoxStatus;
}

const apifoxCacheReadyPromise = hydrateApifoxCache().catch(() => undefined);

async function ensureApifoxCacheReady() {
  await apifoxCacheReadyPromise;
}

function upsertRequest(record: NetworkRequestRecord) {
  const existing = requestsByTab.get(record.tabId) ?? [];
  const next = [record, ...existing.filter((item) => item.requestId !== record.requestId)];
  requestsByTab.set(record.tabId, next.slice(0, MAX_REQUESTS_PER_TAB));
  requestIndex.set(record.requestId, record);
}

function updateRequest(
  requestId: string,
  updater: (record: NetworkRequestRecord) => NetworkRequestRecord,
) {
  const current = requestIndex.get(requestId);
  if (!current) {
    return;
  }

  const next = updater(current);
  const records = requestsByTab.get(current.tabId) ?? [];
  const updated = records.map((item) => (item.requestId === requestId ? next : item));

  requestsByTab.set(current.tabId, updated);
  requestIndex.set(requestId, next);
}

function clearTabRequests(tabId: number) {
  const records = requestsByTab.get(tabId) ?? [];
  records.forEach((record) => {
    requestIndex.delete(record.requestId);
  });
  requestsByTab.delete(tabId);
}

function shouldTrackTabUrl(tabUrl: string | undefined): boolean {
  if (!tabUrl) {
    return false;
  }

  return matchesMonitoredOrigins(tabUrl, monitoredOrigins);
}

function setTabUrl(tabId: number, tabUrl: string | undefined) {
  if (!tabUrl) {
    tabUrlMap.delete(tabId);
    clearTabRequests(tabId);
    return;
  }

  tabUrlMap.set(tabId, tabUrl);

  if (!shouldTrackTabUrl(tabUrl)) {
    clearTabRequests(tabId);
  }
}

async function refreshMonitoredOrigins() {
  const settings = await loadSettings();
  monitoredOrigins = settings.monitoredOrigins;

  tabUrlMap.forEach((tabUrl, tabId) => {
    if (!shouldTrackTabUrl(tabUrl)) {
      clearTabRequests(tabId);
    }
  });
}

async function bootstrapTabs() {
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (typeof tab.id === 'number') {
      setTabUrl(tab.id, tab.url);
    }
  });
}

function resetApifoxCache(sourceUrl = '') {
  apifoxEndpointMap.clear();
  apifoxPathMap.clear();
  apifoxStatus = {
    ready: false,
    sourceUrl,
    endpointCount: 0,
  };
}

async function refreshApifoxData(exportUrl: string): Promise<ApifoxCacheStatus> {
  const normalizedUrl = exportUrl.trim();
  if (!normalizedUrl) {
    resetApifoxCache('');
    await persistApifoxCache();
    return apifoxStatus;
  }

  let response: Response;
  try {
    response = await fetch(normalizedUrl, {
      method: 'GET',
      cache: 'no-store',
    });
  } catch {
    resetApifoxCache(normalizedUrl);
    apifoxStatus.error = '未能连接本地 Apifox 导出地址，请确认 Apifox 已打开并开启本地导出。';
    await persistApifoxCache();
    throw new Error('未能连接本地 Apifox 导出地址，请确认 Apifox 已打开并开启本地导出。');
  }

  if (!response.ok) {
    resetApifoxCache(normalizedUrl);
    apifoxStatus.error = `Apifox 导出地址请求失败：HTTP ${response.status}`;
    await persistApifoxCache();
    throw new Error(`Apifox 导出地址请求失败：HTTP ${response.status}`);
  }

  const schema = (await response.json()) as unknown;
  const lookupMaps = buildApifoxLookupMaps(schema);

  apifoxEndpointMap.clear();
  apifoxPathMap.clear();
  lookupMaps.endpointMap.forEach((apifoxUrl, lookupKey) => {
    apifoxEndpointMap.set(lookupKey, apifoxUrl);
  });
  lookupMaps.pathMap.forEach((apifoxUrl, path) => {
    apifoxPathMap.set(path, apifoxUrl);
  });

  apifoxStatus = {
    ready: true,
    sourceUrl: normalizedUrl,
    endpointCount: lookupMaps.endpointCount,
    updatedAt: Date.now(),
  };

  await persistApifoxCache();
  return apifoxStatus;
}

function getApifoxMatches(requests: Pick<NetworkRequestRecord, 'url' | 'method'>[]) {
  const result: Record<string, string> = {};

  requests.forEach((request) => {
    const path = getUrlPath(request.url);
    const exactKey = getApifoxLookupKey(path, request.method);
    const matchedUrl = apifoxEndpointMap.get(exactKey) ?? apifoxPathMap.get(path);

    if (matchedUrl) {
      result[`${request.method.toUpperCase()} ${request.url}`] = matchedUrl;
    }
  });

  return result;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0 || !TRACKED_RESOURCE_TYPES.has(details.type)) {
      return undefined;
    }

    const tabUrl = tabUrlMap.get(details.tabId);
    if (!shouldTrackTabUrl(tabUrl)) {
      return undefined;
    }

    upsertRequest({
      id: `${details.requestId}-${details.timeStamp}`,
      requestId: details.requestId,
      tabId: details.tabId,
      url: details.url,
      method: details.method,
      type: details.type,
      initiator: details.initiator,
      startedAt: Math.round(details.timeStamp),
      headers: {},
    });

    return undefined;
  },
  { urls: ['<all_urls>'] },
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0 || !TRACKED_RESOURCE_TYPES.has(details.type)) {
      return;
    }

    const tabUrl = tabUrlMap.get(details.tabId);
    if (!shouldTrackTabUrl(tabUrl)) {
      return;
    }

    updateRequest(details.requestId, (record) => ({
      ...record,
      statusCode: details.statusCode,
      completedAt: Math.round(details.timeStamp),
      headers: normalizeHeaders(details.responseHeaders),
    }));
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders'],
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId < 0 || !TRACKED_RESOURCE_TYPES.has(details.type)) {
      return;
    }

    const tabUrl = tabUrlMap.get(details.tabId);
    if (!shouldTrackTabUrl(tabUrl)) {
      return;
    }

    updateRequest(details.requestId, (record) => ({
      ...record,
      completedAt: Math.round(details.timeStamp),
      error: details.error,
    }));
  },
  { urls: ['<all_urls>'] },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrlMap.delete(tabId);
  clearTabRequests(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    setTabUrl(tabId, changeInfo.url);
    return;
  }

  if (changeInfo.status === 'complete' && tab.url) {
    setTabUrl(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !changes[SETTINGS_STORAGE_KEY]) {
    return;
  }

  void refreshMonitoredOrigins();
});

void refreshMonitoredOrigins()
  .then(() => bootstrapTabs())
  .catch(() => {
    monitoredOrigins = [];
  });

chrome.runtime.onMessage.addListener(
  (
    message: RuntimeRequestMessage,
    _sender,
    sendResponse: (response: RuntimeResponseMessage | { ok: true; data: unknown } | { ok: false; error: string }) => void,
  ) => {
    if (message.type === 'quick-copy/get-tab-requests') {
      const requests = requestsByTab.get(message.tabId) ?? [];
      sendResponse({ ok: true, data: requests });
      return false;
    }

    if (message.type === 'quick-copy/clear-tab-requests') {
      clearTabRequests(message.tabId);
      sendResponse({ ok: true, data: [] });
      return false;
    }

    if (message.type === 'quick-copy/get-apifox-status') {
      void ensureApifoxCacheReady()
        .then(() => {
          sendResponse({ ok: true, data: apifoxStatus });
        })
        .catch((error: unknown) => {
          const messageText = error instanceof Error ? error.message : '读取 Apifox 状态失败。';
          sendResponse({ ok: false, error: messageText });
        });
      return true;
    }

    if (message.type === 'quick-copy/clear-apifox-data') {
      void ensureApifoxCacheReady()
        .then(async () => {
          resetApifoxCache('');
          await persistApifoxCache();
          sendResponse({ ok: true, data: apifoxStatus });
        })
        .catch((error: unknown) => {
          const messageText = error instanceof Error ? error.message : '清空 Apifox 数据失败。';
          sendResponse({ ok: false, error: messageText });
        });
      return true;
    }

    if (message.type === 'quick-copy/get-apifox-matches') {
      void ensureApifoxCacheReady()
        .then(() => {
          sendResponse({ ok: true, data: getApifoxMatches(message.requests) });
        })
        .catch((error: unknown) => {
          const messageText = error instanceof Error ? error.message : '读取 Apifox 匹配失败。';
          sendResponse({ ok: false, error: messageText });
        });
      return true;
    }

    if (message.type === 'quick-copy/refresh-apifox-data') {
      void ensureApifoxCacheReady()
        .then(() => refreshApifoxData(message.exportUrl))
        .then((status) => sendResponse({ ok: true, data: status }))
        .catch((error: unknown) => {
          const messageText = error instanceof Error ? error.message : '刷新 Apifox 数据失败。';
          sendResponse({ ok: false, error: messageText });
        });
      return true;
    }

    sendResponse({ ok: false, error: 'Unknown message type.' });
    return false;
  },
);
