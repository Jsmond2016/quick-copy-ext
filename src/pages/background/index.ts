import {
  ApifoxCacheStatus,
  CapturedResponsePayload,
  buildApifoxLookupMaps,
  loadSettings,
  MAX_REQUESTS_PER_TAB,
  matchesMonitoredOrigins,
  NetworkRequestRecord,
  QuickCopySettings,
  SETTINGS_STORAGE_KEY,
  withRequestAbnormalState,
} from '@src/lib/quick-copy';
import { getApifoxMatches as buildApifoxMatches } from '@pages/background/apifox-matches';
import { registerRequestTrackingListeners } from '@pages/background/request-events';
import { applyCapturedResponse as applyCapturedResponseToRequest } from '@pages/background/response-capture';
import { registerRuntimeMessageListener } from '@pages/background/runtime-messages';

const requestsByTab = new Map<number, NetworkRequestRecord[]>();
const requestIndex = new Map<string, NetworkRequestRecord>();
const tabUrlMap = new Map<number, string>();
const apifoxEndpointMap = new Map<string, string>();
const apifoxPathMap = new Map<string, string>();
const apifoxNameMap = new Map<string, string>();
const RUNTIME_SESSION_CACHE_KEY = 'quick-copy-runtime-session-cache';
const APIFOX_SESSION_CACHE_KEY = 'quick-copy-apifox-session-cache';
const RUNTIME_CACHE_VERSION = 2;
const defaultApifoxStatus: ApifoxCacheStatus = {
  ready: false,
  sourceUrl: '',
  endpointCount: 0,
};

interface SerializedApifoxCache {
  status: ApifoxCacheStatus;
  endpointEntries: [string, string][];
  pathEntries: [string, string][];
  nameEntries: [string, string][];
}

interface SerializedRuntimeCache {
  version: number;
  requestsByTab: [number, NetworkRequestRecord[]][];
  tabUrlEntries: [number, string][];
}

let apifoxStatus: ApifoxCacheStatus = defaultApifoxStatus;
let monitoredOrigins: QuickCopySettings['monitoredOrigins'] = [];
let responseErrorRule = '';
let runtimePersistTimer: ReturnType<typeof setTimeout> | undefined;

async function persistRuntimeCache() {
  const payload: SerializedRuntimeCache = {
    version: RUNTIME_CACHE_VERSION,
    requestsByTab: Array.from(requestsByTab.entries()),
    tabUrlEntries: Array.from(tabUrlMap.entries()),
  };

  await chrome.storage.session.set({
    [RUNTIME_SESSION_CACHE_KEY]: payload,
  });
}

function scheduleRuntimeCachePersist() {
  if (runtimePersistTimer !== undefined) {
    clearTimeout(runtimePersistTimer);
  }

  runtimePersistTimer = setTimeout(() => {
    runtimePersistTimer = undefined;
    void persistRuntimeCache();
  }, 80);
}

async function hydrateRuntimeCache() {
  const stored = await chrome.storage.session.get(RUNTIME_SESSION_CACHE_KEY);
  const payload = stored[RUNTIME_SESSION_CACHE_KEY] as SerializedRuntimeCache | undefined;

  if (!payload || typeof payload !== 'object') {
    return;
  }

  if (payload.version !== RUNTIME_CACHE_VERSION) {
    await chrome.storage.session.remove(RUNTIME_SESSION_CACHE_KEY);
    return;
  }

  requestsByTab.clear();
  requestIndex.clear();
  tabUrlMap.clear();

  payload.requestsByTab?.forEach(([tabId, records]) => {
    if (typeof tabId !== 'number' || !Array.isArray(records)) {
      return;
    }

    const nextRecords = records
      .filter((record): record is NetworkRequestRecord => Boolean(record) && typeof record === 'object')
      .slice(0, MAX_REQUESTS_PER_TAB);

    requestsByTab.set(tabId, nextRecords);
    nextRecords.forEach((record) => {
      requestIndex.set(record.requestId, record);
    });
  });

  payload.tabUrlEntries?.forEach(([tabId, tabUrl]) => {
    if (typeof tabId === 'number' && typeof tabUrl === 'string') {
      tabUrlMap.set(tabId, tabUrl);
    }
  });
}

async function persistApifoxCache() {
  const payload: SerializedApifoxCache = {
    status: apifoxStatus,
    endpointEntries: Array.from(apifoxEndpointMap.entries()),
    pathEntries: Array.from(apifoxPathMap.entries()),
    nameEntries: Array.from(apifoxNameMap.entries()),
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
  apifoxNameMap.clear();

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

  payload.nameEntries?.forEach(([lookupKey, apiName]) => {
    if (typeof lookupKey === 'string' && typeof apiName === 'string') {
      apifoxNameMap.set(lookupKey, apiName);
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
const runtimeCacheReadyPromise = hydrateRuntimeCache().catch(() => undefined);

async function ensureApifoxCacheReady() {
  await apifoxCacheReadyPromise;
}

async function ensureRuntimeCacheReady() {
  await runtimeCacheReadyPromise;
}

function notifyTabRequestsUpdated(tabId: number) {
  const message = {
    type: 'quick-copy/tab-requests-updated',
    tabId,
  };

  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

function upsertRequest(record: NetworkRequestRecord) {
  const existing = requestsByTab.get(record.tabId) ?? [];
  const next = [record, ...existing.filter((item) => item.requestId !== record.requestId)];
  requestsByTab.set(record.tabId, next.slice(0, MAX_REQUESTS_PER_TAB));
  requestIndex.set(record.requestId, record);
  scheduleRuntimeCachePersist();
  notifyTabRequestsUpdated(record.tabId);
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
  scheduleRuntimeCachePersist();
  notifyTabRequestsUpdated(current.tabId);
}

function replaceRequestRecord(nextRecord: NetworkRequestRecord) {
  const records = requestsByTab.get(nextRecord.tabId) ?? [];
  const updatedRecords = records.map((item) => (item.requestId === nextRecord.requestId ? nextRecord : item));

  requestsByTab.set(nextRecord.tabId, updatedRecords);
  requestIndex.set(nextRecord.requestId, nextRecord);
  scheduleRuntimeCachePersist();
  notifyTabRequestsUpdated(nextRecord.tabId);
}

function clearTabRequests(tabId: number) {
  const records = requestsByTab.get(tabId) ?? [];
  records.forEach((record) => {
    requestIndex.delete(record.requestId);
  });
  requestsByTab.delete(tabId);
  scheduleRuntimeCachePersist();
  notifyTabRequestsUpdated(tabId);
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
    scheduleRuntimeCachePersist();
    return;
  }

  scheduleRuntimeCachePersist();
}

function shouldTrackRequest(tabId: number, initiator?: string) {
  const tabUrl = tabUrlMap.get(tabId);
  if (shouldTrackTabUrl(tabUrl)) {
    return true;
  }

  if (initiator && matchesMonitoredOrigins(initiator, monitoredOrigins)) {
    tabUrlMap.set(tabId, initiator);
    scheduleRuntimeCachePersist();
    return true;
  }

  return false;
}

async function refreshMonitoredOrigins() {
  const settings = await loadSettings();
  monitoredOrigins = settings.monitoredOrigins;
  responseErrorRule = settings.responseErrorRule;

  tabUrlMap.forEach((tabUrl, tabId) => {
    if (!shouldTrackTabUrl(tabUrl)) {
      clearTabRequests(tabId);
    }
  });

  requestsByTab.forEach((records, tabId) => {
    const nextRecords = records.map((record) => withRequestAbnormalState(record, responseErrorRule));
    requestsByTab.set(tabId, nextRecords);
    nextRecords.forEach((record) => {
      requestIndex.set(record.requestId, record);
    });
    notifyTabRequestsUpdated(tabId);
  });

  scheduleRuntimeCachePersist();
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
  apifoxNameMap.clear();
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
  apifoxNameMap.clear();
  lookupMaps.endpointMap.forEach((apifoxUrl, lookupKey) => {
    apifoxEndpointMap.set(lookupKey, apifoxUrl);
  });
  lookupMaps.pathMap.forEach((apifoxUrl, path) => {
    apifoxPathMap.set(path, apifoxUrl);
  });
  lookupMaps.endpointNameMap.forEach((apiName, lookupKey) => {
    apifoxNameMap.set(lookupKey, apiName);
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
  return buildApifoxMatches(requests, {
    endpointMap: apifoxEndpointMap,
    nameMap: apifoxNameMap,
    pathMap: apifoxPathMap,
  });
}

function applyCapturedResponse(tabId: number, payload: CapturedResponsePayload) {
  applyCapturedResponseToRequest(tabId, payload, {
    getRecordsByTabId: (currentTabId) => requestsByTab.get(currentTabId) ?? [],
    replaceRequestRecord,
    responseErrorRule,
  });
}

registerRequestTrackingListeners({
  requestIndex,
  shouldTrackRequest,
  upsertRequest,
  updateRequest,
  getResponseErrorRule: () => responseErrorRule,
});

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
  .then(async () => {
    await ensureRuntimeCacheReady();
    await bootstrapTabs();
  })
  .catch(() => {
    monitoredOrigins = [];
  });

registerRuntimeMessageListener({
  applyCapturedResponse,
  clearTabRequests,
  ensureApifoxCacheReady,
  ensureRuntimeCacheReady,
  getApifoxMatches,
  getApifoxStatus: () => apifoxStatus,
  getRequestsByTabId: (tabId) => requestsByTab.get(tabId) ?? [],
  persistClearedApifoxCache: async () => {
    resetApifoxCache('');
    await persistApifoxCache();
    return apifoxStatus;
  },
  refreshApifoxData,
});
