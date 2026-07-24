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
import { createPageErrorStore } from '@pages/background/page-errors';
import { createRecordingService } from '@pages/background/recording';
import { createScreenshotService, isScreenshotSupported } from '@pages/background/screenshot';
import {
  registerRecordingContextMenu,
  type RecordingContextMenuController,
} from '@pages/background/recording-context-menu';
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
let pageErrorCaptureEnabled = true;
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
          error:
            typeof payload.status.error === 'string' &&
            !payload.status.error.includes('本地') &&
            !payload.status.error.includes('127.0.0.1')
              ? payload.status.error
              : undefined,
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

function getTabUrlOrigin(tabUrl: string): string {
  try {
    return new URL(tabUrl).origin.toLowerCase();
  } catch {
    return tabUrl;
  }
}

function setTabUrl(tabId: number, tabUrl: string | undefined) {
  if (!tabUrl) {
    tabUrlMap.delete(tabId);
    clearTabRequests(tabId);
    return;
  }

  const previousTabUrl = tabUrlMap.get(tabId);
  const domainChanged = previousTabUrl !== undefined
    && getTabUrlOrigin(previousTabUrl) !== getTabUrlOrigin(tabUrl);
  tabUrlMap.set(tabId, tabUrl);

  if (domainChanged) {
    clearTabRequests(tabId);
  }

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

const pageErrorStore = createPageErrorStore((tabId, senderUrl) =>
  pageErrorCaptureEnabled && shouldTrackTabUrl(senderUrl ?? tabUrlMap.get(tabId)));
let recordingContextMenu: RecordingContextMenuController | undefined;
const recordingService = createRecordingService({
  onSessionChanged: (session) => recordingContextMenu?.update(session),
});
const screenshotService = createScreenshotService();
recordingContextMenu = registerRecordingContextMenu({
  getLatest: () => recordingService.getLatest(),
  pause: (tabId) => recordingService.pause(tabId),
  resume: (tabId) => recordingService.resume(tabId),
  start: (tabId) => recordingService.startFromContextMenu(tabId),
  startWindow: (tabId) => recordingService.startWindowFromContextMenu(tabId),
  stop: (tabId) => recordingService.stop(tabId),
  screenshot: isScreenshotSupported()
    ? (tabId) => screenshotService.start(tabId, 'context-menu')
    : undefined,
});

async function refreshMonitoredOrigins() {
  const settings = await loadSettings();
  monitoredOrigins = settings.monitoredOrigins;
  responseErrorRule = settings.responseErrorRule;
  pageErrorCaptureEnabled = settings.pageErrorCaptureEnabled;

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

async function isPageMonitoringEnabled(tabUrl?: string): Promise<boolean> {
  const settings = await loadSettings();
  return Boolean(tabUrl) && matchesMonitoredOrigins(tabUrl ?? '', settings.monitoredOrigins);
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

const APIFOX_ONLINE_API_URL = 'https://api.apifox.com/v1/projects';
const APIFOX_API_VERSION = '2024-03-28';

function buildApifoxOnlineExportBody() {
  return JSON.stringify({
    scope: { type: 'ALL' },
    options: { includeApifoxExtensionProperties: true },
    oasVersion: '3.1',
    exportFormat: 'JSON',
  });
}

async function refreshApifoxData(
  exportUrl: string,
  authToken: string,
): Promise<ApifoxCacheStatus> {
  const projectId = exportUrl.trim();
  if (!projectId) {
    resetApifoxCache('');
    await persistApifoxCache();
    return apifoxStatus;
  }

  if (!authToken) {
    resetApifoxCache(projectId);
    apifoxStatus.error = '未配置 Apifox 授权令牌，请在设置中填写。';
    await persistApifoxCache();
    throw new Error('未配置 Apifox 授权令牌，请在设置中填写。');
  }

  const apiUrl = `${APIFOX_ONLINE_API_URL}/${projectId}/export-openapi?locale=zh-CN`;

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'X-Apifox-Api-Version': APIFOX_API_VERSION,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: buildApifoxOnlineExportBody(),
    });
  } catch {
    resetApifoxCache(projectId);
    apifoxStatus.error = '无法连接 Apifox 在线服务，请检查网络或授权令牌是否正确。';
    await persistApifoxCache();
    throw new Error('无法连接 Apifox 在线服务，请检查网络或授权令牌是否正确。');
  }

  if (!response.ok) {
    resetApifoxCache(projectId);
    apifoxStatus.error = `Apifox 在线导出请求失败：HTTP ${response.status}`;
    await persistApifoxCache();
    throw new Error(`Apifox 在线导出请求失败：HTTP ${response.status}`);
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
    sourceUrl: projectId,
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
  void pageErrorStore.clear(tabId, false);
  void recordingService.handleTabRemoved(tabId);
  void screenshotService.handleTabRemoved(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    setTabUrl(tabId, changeInfo.url);
    void screenshotService.handleTabUpdated(tabId);
    return;
  }

  if (changeInfo.status === 'complete' && tab.url) {
    setTabUrl(tabId, tab.url);
    void recordingService.handleTabUpdated(tabId, tab.windowId);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'quick-copy/capture-screenshot' || !isScreenshotSupported()) return;
  void chrome.tabs.query({ active: true, currentWindow: true })
    .then(([tab]) => {
      if (typeof tab?.id !== 'number') throw new Error('未找到当前标签页。');
      return screenshotService.start(tab.id, 'command');
    })
    .catch(() => undefined);
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
  clearPageErrors: pageErrorStore.clear,
  clearTabRequests,
  ensureApifoxCacheReady,
  ensureRuntimeCacheReady,
  getApifoxMatches,
  getApifoxStatus: () => apifoxStatus,
  getPageErrorsByTabId: pageErrorStore.get,
  getRequestsByTabId: (tabId) => requestsByTab.get(tabId) ?? [],
  persistClearedApifoxCache: async () => {
    resetApifoxCache('');
    await persistApifoxCache();
    return apifoxStatus;
  },
  refreshApifoxData,
  reportPageError: pageErrorStore.report,
  isPageMonitoringEnabled,
  recording: recordingService,
  screenshot: screenshotService,
  startPageSession: (tabId) => pageErrorStore.clear(tabId, false),
});
