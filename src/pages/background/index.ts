import {
  ApifoxCacheStatus,
  extractApifoxEndpoints,
  getApifoxLookupKey,
  getUrlPath,
  MAX_REQUESTS_PER_TAB,
  NetworkRequestRecord,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
  normalizeHeaders,
} from '@src/lib/quick-copy';

const requestsByTab = new Map<number, NetworkRequestRecord[]>();
const requestIndex = new Map<string, NetworkRequestRecord>();
const TRACKED_RESOURCE_TYPES = new Set(['xmlhttprequest']);
const apifoxEndpointMap = new Map<string, string>();
const apifoxPathMap = new Map<string, string>();
const defaultApifoxStatus: ApifoxCacheStatus = {
  ready: false,
  sourceUrl: '',
  endpointCount: 0,
};

let apifoxStatus: ApifoxCacheStatus = defaultApifoxStatus;

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
    throw new Error('未能连接本地 Apifox 导出地址，请确认 Apifox 已打开并开启本地导出。');
  }

  if (!response.ok) {
    resetApifoxCache(normalizedUrl);
    apifoxStatus.error = `Apifox 导出地址请求失败：HTTP ${response.status}`;
    throw new Error(`Apifox 导出地址请求失败：HTTP ${response.status}`);
  }

  const schema = (await response.json()) as unknown;
  const endpoints = extractApifoxEndpoints(schema);

  apifoxEndpointMap.clear();
  apifoxPathMap.clear();
  endpoints.forEach((endpoint) => {
    apifoxEndpointMap.set(getApifoxLookupKey(endpoint.path, endpoint.method), endpoint.apifoxUrl);
    if (!apifoxPathMap.has(endpoint.path)) {
      apifoxPathMap.set(endpoint.path, endpoint.apifoxUrl);
    }
  });

  apifoxStatus = {
    ready: true,
    sourceUrl: normalizedUrl,
    endpointCount: endpoints.length,
    updatedAt: Date.now(),
  };

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

    updateRequest(details.requestId, (record) => ({
      ...record,
      completedAt: Math.round(details.timeStamp),
      error: details.error,
    }));
  },
  { urls: ['<all_urls>'] },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  requestsByTab.delete(tabId);
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
      requestsByTab.delete(message.tabId);
      sendResponse({ ok: true, data: [] });
      return false;
    }

    if (message.type === 'quick-copy/get-apifox-status') {
      sendResponse({ ok: true, data: apifoxStatus });
      return false;
    }

    if (message.type === 'quick-copy/clear-apifox-data') {
      resetApifoxCache('');
      sendResponse({ ok: true, data: apifoxStatus });
      return false;
    }

    if (message.type === 'quick-copy/get-apifox-matches') {
      sendResponse({ ok: true, data: getApifoxMatches(message.requests) });
      return false;
    }

    if (message.type === 'quick-copy/refresh-apifox-data') {
      void refreshApifoxData(message.exportUrl)
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
