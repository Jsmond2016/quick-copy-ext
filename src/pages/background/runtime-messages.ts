import {
  ApifoxCacheStatus,
  ApifoxMatchResult,
  CapturedResponsePayload,
  NetworkRequestRecord,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
} from '@src/lib/quick-copy';

interface RegisterRuntimeMessageListenerOptions {
  applyCapturedResponse: (tabId: number, payload: CapturedResponsePayload) => void;
  clearTabRequests: (tabId: number) => void;
  ensureApifoxCacheReady: () => Promise<void>;
  ensureRuntimeCacheReady: () => Promise<void>;
  getApifoxMatches: (
    requests: Pick<NetworkRequestRecord, 'url' | 'method'>[],
  ) => Record<string, ApifoxMatchResult>;
  getApifoxStatus: () => ApifoxCacheStatus;
  getRequestsByTabId: (tabId: number) => NetworkRequestRecord[];
  persistClearedApifoxCache: () => Promise<ApifoxCacheStatus>;
  refreshApifoxData: (exportUrl: string) => Promise<ApifoxCacheStatus>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function registerRuntimeMessageListener({
  applyCapturedResponse,
  clearTabRequests,
  ensureApifoxCacheReady,
  ensureRuntimeCacheReady,
  getApifoxMatches,
  getApifoxStatus,
  getRequestsByTabId,
  persistClearedApifoxCache,
  refreshApifoxData,
}: RegisterRuntimeMessageListenerOptions): void {
  chrome.runtime.onMessage.addListener(
    (
      message: RuntimeRequestMessage,
      sender,
      sendResponse: (
        response:
          | RuntimeResponseMessage
          | { ok: true; data: unknown }
          | { ok: false; error: string },
      ) => void,
    ) => {
      if (message.type === 'quick-copy/get-tab-requests') {
        void ensureRuntimeCacheReady()
          .then(() => {
            sendResponse({ ok: true, data: getRequestsByTabId(message.tabId) });
          })
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取请求记录失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/clear-tab-requests') {
        void ensureRuntimeCacheReady()
          .then(() => {
            clearTabRequests(message.tabId);
            sendResponse({ ok: true, data: [] });
          })
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '清空请求记录失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-apifox-status') {
        void ensureApifoxCacheReady()
          .then(() => {
            sendResponse({ ok: true, data: getApifoxStatus() });
          })
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取 Apifox 状态失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/clear-apifox-data') {
        void ensureApifoxCacheReady()
          .then(async () => {
            const status = await persistClearedApifoxCache();
            sendResponse({ ok: true, data: status });
          })
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '清空 Apifox 数据失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-apifox-matches') {
        void ensureApifoxCacheReady()
          .then(() => {
            sendResponse({ ok: true, data: getApifoxMatches(message.requests) });
          })
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取 Apifox 匹配失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/refresh-apifox-data') {
        void ensureApifoxCacheReady()
          .then(() => refreshApifoxData(message.exportUrl))
          .then((status) => sendResponse({ ok: true, data: status }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '刷新 Apifox 数据失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/report-response-body') {
        const tabId = sender.tab?.id;

        if (typeof tabId === 'number') {
          void ensureRuntimeCacheReady().then(() => {
            applyCapturedResponse(tabId, message.payload);
          });
        }

        sendResponse({ ok: true, data: null });
        return false;
      }

      sendResponse({ ok: false, error: 'Unknown message type.' });
      return false;
    },
  );
}
