import {
  MAX_REQUESTS_PER_TAB,
  NetworkRequestRecord,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
  normalizeHeaders,
} from '@src/lib/quick-copy';

const requestsByTab = new Map<number, NetworkRequestRecord[]>();
const requestIndex = new Map<string, NetworkRequestRecord>();
const TRACKED_RESOURCE_TYPES = new Set(['xmlhttprequest']);

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
    sendResponse: (response: RuntimeResponseMessage) => void,
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

    sendResponse({ ok: false, error: 'Unknown message type.' });
    return false;
  },
);
