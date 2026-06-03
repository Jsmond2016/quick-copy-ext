import {
  NetworkRequestRecord,
  normalizeHeaders,
  withRequestAbnormalState,
} from '@src/lib/quick-copy';

interface RegisterRequestTrackingListenersOptions {
  requestIndex: Map<string, NetworkRequestRecord>;
  shouldTrackRequest: (tabId: number, initiator?: string) => boolean;
  upsertRequest: (record: NetworkRequestRecord) => void;
  updateRequest: (
    requestId: string,
    updater: (record: NetworkRequestRecord) => NetworkRequestRecord,
  ) => void;
  getResponseErrorRule: () => string;
}

const TRACKED_RESOURCE_TYPES = new Set(['xmlhttprequest', 'fetch']);

export function registerRequestTrackingListeners({
  requestIndex,
  shouldTrackRequest,
  upsertRequest,
  updateRequest,
  getResponseErrorRule,
}: RegisterRequestTrackingListenersOptions): void {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.tabId < 0 || !TRACKED_RESOURCE_TYPES.has(details.type)) {
        return undefined;
      }

      if (!shouldTrackRequest(details.tabId, details.initiator)) {
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

      if (!requestIndex.has(details.requestId)) {
        return;
      }

      updateRequest(details.requestId, (record) =>
        withRequestAbnormalState(
          {
            ...record,
            statusCode: details.statusCode,
            completedAt: Math.round(details.timeStamp),
            headers: normalizeHeaders(details.responseHeaders),
          },
          getResponseErrorRule(),
        ),
      );
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders'],
  );

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (details.tabId < 0 || !TRACKED_RESOURCE_TYPES.has(details.type)) {
        return;
      }

      if (!requestIndex.has(details.requestId)) {
        return;
      }

      updateRequest(details.requestId, (record) =>
        withRequestAbnormalState(
          {
            ...record,
            completedAt: Math.round(details.timeStamp),
            error: details.error,
          },
          getResponseErrorRule(),
        ),
      );
    },
    { urls: ['<all_urls>'] },
  );
}
