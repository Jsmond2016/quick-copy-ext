import type {
  ApifoxCacheStatus,
  ApifoxMatchResult,
  CapturedPageErrorPayload,
  CapturedResponsePayload,
  NetworkRequestRecord,
  PageErrorRecord,
  RecordingSession,
  RuntimeEventMessage,
  RuntimeRequestMessage,
  RuntimeResponseMessage,
} from '@src/lib/quick-copy';

interface RegisterRuntimeMessageListenerOptions {
  applyCapturedResponse: (tabId: number, payload: CapturedResponsePayload) => void;
  clearPageErrors: (tabId: number) => Promise<void>;
  clearTabRequests: (tabId: number) => void;
  ensureApifoxCacheReady: () => Promise<void>;
  ensureRuntimeCacheReady: () => Promise<void>;
  getApifoxMatches: (
    requests: Pick<NetworkRequestRecord, 'url' | 'method'>[],
  ) => Record<string, ApifoxMatchResult>;
  getApifoxStatus: () => ApifoxCacheStatus;
  getRequestsByTabId: (tabId: number) => NetworkRequestRecord[];
  getPageErrorsByTabId: (tabId: number) => Promise<PageErrorRecord[]>;
  persistClearedApifoxCache: () => Promise<ApifoxCacheStatus>;
  refreshApifoxData: (exportUrl: string, authToken: string) => Promise<ApifoxCacheStatus>;
  reportPageError: (
    tabId: number,
    payload: CapturedPageErrorPayload,
    senderUrl?: string,
  ) => Promise<boolean>;
  isPageMonitoringEnabled: (senderUrl?: string) => Promise<boolean>;
  recording: {
    get: (tabId: number) => Promise<RecordingSession>;
    getLatest: () => Promise<RecordingSession>;
    clearPreview: () => Promise<void>;
    start: (options: { tabId: number; streamId: string }) => Promise<RecordingSession>;
    pause: (tabId: number) => Promise<RecordingSession>;
    resume: (tabId: number) => Promise<RecordingSession>;
    stop: (tabId: number) => Promise<RecordingSession>;
    handleStopped: (payload: { tabId: number; blobUrl: string; fileName: string }) => Promise<void>;
    handleFailed: (tabId: number, error: string) => Promise<void>;
  };
  startPageSession: (tabId: number) => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function registerRuntimeMessageListener({
  applyCapturedResponse,
  clearPageErrors,
  clearTabRequests,
  ensureApifoxCacheReady,
  ensureRuntimeCacheReady,
  getApifoxMatches,
  getApifoxStatus,
  getRequestsByTabId,
  getPageErrorsByTabId,
  persistClearedApifoxCache,
  refreshApifoxData,
  reportPageError,
  isPageMonitoringEnabled,
  recording,
  startPageSession,
}: RegisterRuntimeMessageListenerOptions): void {
  chrome.runtime.onMessage.addListener(
    (
      message: RuntimeRequestMessage | RuntimeEventMessage,
      sender,
      sendResponse: (
        response:
          | RuntimeResponseMessage
          | { ok: true; data: unknown }
          | { ok: false; error: string },
      ) => void,
    ) => {
      if (
        message.type === 'quick-copy/tab-requests-updated'
        || message.type === 'quick-copy/page-errors-updated'
        || message.type === 'quick-copy/recording-updated'
        || message.type === 'quick-copy/offscreen-start-recording'
        || message.type === 'quick-copy/offscreen-stop-recording'
        || message.type === 'quick-copy/offscreen-pause-recording'
        || message.type === 'quick-copy/offscreen-resume-recording'
        || message.type === 'quick-copy/offscreen-release-recording'
      ) {
        return false;
      }

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

      if (message.type === 'quick-copy/get-tab-page-errors') {
        void getPageErrorsByTabId(message.tabId)
          .then((records) => sendResponse({ ok: true, data: records }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取页面异常失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/clear-tab-page-errors') {
        void clearPageErrors(message.tabId)
          .then(() => sendResponse({ ok: true, data: [] }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '清空页面异常失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-recording-session') {
        void recording.get(message.tabId)
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取录制状态失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-current-tab-recording-session') {
        const tabId = sender.tab?.id;
        if (typeof tabId !== 'number') {
          sendResponse({ ok: true, data: { status: 'idle' } });
          return false;
        }
        void recording.get(tabId)
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取录制状态失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-latest-recording-session') {
        void recording.getLatest()
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取最近录屏失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/clear-recording-preview') {
        void recording.clearPreview()
          .then(() => sendResponse({ ok: true, data: null }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '清除录屏预览失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/start-recording') {
        void recording.start({ tabId: message.tabId, streamId: message.streamId })
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '开始录制失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/pause-recording') {
        void recording.pause(message.tabId)
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '暂停录制失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/resume-recording') {
        void recording.resume(message.tabId)
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '继续录制失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/stop-recording') {
        void recording.stop(message.tabId)
          .then((session) => sendResponse({ ok: true, data: session }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '停止录制失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/offscreen-recording-stopped') {
        void recording.handleStopped(message)
          .then(() => sendResponse({ ok: true, data: null }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '保存录屏失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/offscreen-recording-failed') {
        void recording.handleFailed(message.tabId, message.error)
          .then(() => sendResponse({ ok: true, data: null }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '录制状态更新失败。') });
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
          .then(() => refreshApifoxData(message.exportUrl, message.authToken))
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

      if (message.type === 'quick-copy/report-page-error') {
        const tabId = sender.tab?.id;

        if (typeof tabId !== 'number') {
          sendResponse({ ok: true, data: { accepted: false } });
          return false;
        }

        void reportPageError(tabId, message.payload, sender.tab?.url)
          .then((accepted) => sendResponse({ ok: true, data: { accepted } }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '上报页面异常失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/get-page-monitoring-state') {
        void isPageMonitoringEnabled(sender.tab?.url)
          .then((enabled) => sendResponse({ ok: true, data: { enabled } }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '读取页面监听配置失败。') });
          });
        return true;
      }

      if (message.type === 'quick-copy/page-session-started') {
        const tabId = sender.tab?.id;
        if (typeof tabId === 'number') {
          void startPageSession(tabId);
        }
        sendResponse({ ok: true, data: null });
        return false;
      }

      if (message.type === 'quick-copy/open-popup') {
        void chrome.action.openPopup()
          .then(() => sendResponse({ ok: true, data: null }))
          .catch((error: unknown) => {
            sendResponse({ ok: false, error: getErrorMessage(error, '请点击扩展图标查看详情。') });
          });
        return true;
      }

      sendResponse({ ok: false, error: 'Unknown message type.' });
      return false;
    },
  );
}
