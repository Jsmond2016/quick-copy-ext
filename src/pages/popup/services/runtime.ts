import type {
  ApifoxCacheStatus,
  ApifoxMatchResult,
  ApifoxMatchesResponse,
  ApifoxRefreshResponse,
  ApifoxStatusResponse,
  NetworkRequestRecord,
  PageErrorRecord,
  PageErrorsResponse,
  RecordingSession,
  RecordingSessionResponse,
  RuntimeEventMessage,
  RuntimeResponseMessage,
} from '@src/lib/quick-copy';
import { DEFAULT_APIFOX_STATUS } from '@pages/popup/constants';

interface ExternalBatchQuickMockRequest {
  type: 'BATCH_QUICK_MOCK';
  requestId: string;
  urls: string[];
}

interface ExternalBatchQuickMockResponse {
  success: boolean;
  jobId?: string;
  status: 'success' | 'partial_success' | 'failed';
  total: number;
  successCount: number;
  failCount: number;
  message: string;
}

const PAGE_ERROR_BACKGROUND_OUTDATED_MESSAGE =
  '页面异常采集后台尚未更新，请在扩展管理页重新加载 Quick Copy Ext。';

function isUnknownMessageTypeError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unknown message type.';
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function unwrapPageErrorsResponse(response: PageErrorsResponse): PageErrorRecord[] {
  if (!response.ok) {
    if (response.error === 'Unknown message type.') {
      throw new Error(PAGE_ERROR_BACKGROUND_OUTDATED_MESSAGE);
    }

    throw new Error(response.error);
  }

  return response.data;
}

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function getTabRequests(tabId: number): Promise<NetworkRequestRecord[]> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/get-tab-requests',
    tabId,
  })) as RuntimeResponseMessage;

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.data;
}

export async function clearTabRequests(tabId: number): Promise<void> {
  await chrome.runtime.sendMessage({
    type: 'quick-copy/clear-tab-requests',
    tabId,
  });
}

export async function getTabPageErrors(tabId: number): Promise<PageErrorRecord[]> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/get-tab-page-errors',
    tabId,
  })) as PageErrorsResponse;

  return unwrapPageErrorsResponse(response);
}

export async function clearTabPageErrors(tabId: number): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/clear-tab-page-errors',
    tabId,
  })) as PageErrorsResponse;

  unwrapPageErrorsResponse(response);
}

function unwrapRecordingSessionResponse(response: RecordingSessionResponse): RecordingSession {
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.data;
}

export function isTabRecordingSupported(): boolean {
  return typeof chrome.tabCapture?.getMediaStreamId === 'function'
    && typeof chrome.offscreen?.createDocument === 'function'
    && typeof chrome.downloads?.download === 'function';
}

export async function getRecordingSession(tabId: number): Promise<RecordingSession> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/get-recording-session',
    tabId,
  })) as RecordingSessionResponse;
  return unwrapRecordingSessionResponse(response);
}

export async function startTabRecording(tabId: number): Promise<RecordingSession> {
  if (!isTabRecordingSupported()) {
    throw new Error('当前浏览器不支持标签页录制。');
  }

  // This API must run directly from the Popup click handler to retain user activation.
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/start-recording',
    tabId,
    streamId,
  })) as RecordingSessionResponse;
  return unwrapRecordingSessionResponse(response);
}

export async function startWindowRecording(tabId: number): Promise<RecordingSession> {
  if (!isTabRecordingSupported() || typeof chrome.desktopCapture?.chooseDesktopMedia !== 'function') {
    throw new Error('当前浏览器不支持窗口录制。');
  }

  const url = chrome.runtime.getURL(`src/pages/recording-picker/index.html?tabId=${tabId}`);
  await chrome.windows.create({ url, type: 'popup', width: 360, height: 180, focused: true });
  return { status: 'idle' };
}

export async function stopTabRecording(tabId: number): Promise<RecordingSession> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/stop-recording',
    tabId,
  })) as RecordingSessionResponse;
  return unwrapRecordingSessionResponse(response);
}

export async function pauseTabRecording(tabId: number): Promise<RecordingSession> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/pause-recording',
    tabId,
  })) as RecordingSessionResponse;
  return unwrapRecordingSessionResponse(response);
}

export async function resumeTabRecording(tabId: number): Promise<RecordingSession> {
  const response = (await chrome.runtime.sendMessage({
    type: 'quick-copy/resume-recording',
    tabId,
  })) as RecordingSessionResponse;
  return unwrapRecordingSessionResponse(response);
}

export async function showRecordingHistory(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: 'quick-copy/show-recording-history',
  }) as { ok: boolean; error?: string };
  if (!response.ok) {
    throw new Error(response.error || '打开录屏目录失败。');
  }
}

export async function getApifoxStatus(): Promise<ApifoxCacheStatus> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/get-apifox-status',
    })) as ApifoxStatusResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    return DEFAULT_APIFOX_STATUS;
  }
}

export async function refreshApifoxData(
  exportUrl: string,
  authToken: string,
): Promise<ApifoxCacheStatus> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/refresh-apifox-data',
      exportUrl,
      authToken,
    })) as ApifoxRefreshResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    throw new Error('当前扩展后台不支持 Apifox 缓存刷新，请重新加载扩展。');
  }
}

export async function clearApifoxData(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: 'quick-copy/clear-apifox-data',
    });
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }
  }
}

export async function getApifoxMatches(
  requests: Pick<NetworkRequestRecord, 'url' | 'method'>[],
): Promise<Record<string, ApifoxMatchResult>> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/get-apifox-matches',
      requests,
    })) as ApifoxMatchesResponse;

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    if (!isUnknownMessageTypeError(error)) {
      throw error;
    }

    throw new Error('当前扩展后台不支持 Apifox 匹配，请重新加载扩展。');
  }
}

export async function sendBatchQuickMockToExtension(
  extensionId: string,
  urls: string[],
): Promise<ExternalBatchQuickMockResponse> {
  const normalizedExtensionId = extensionId.trim();
  const request: ExternalBatchQuickMockRequest = {
    type: 'BATCH_QUICK_MOCK',
    requestId: crypto.randomUUID?.() ?? `${Date.now()}`,
    urls,
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      normalizedExtensionId,
      request,
      (response?: ExternalBatchQuickMockResponse) => {
        const lastErrorMessage = chrome.runtime.lastError?.message?.trim();

        if (lastErrorMessage) {
          if (
            lastErrorMessage.includes('Could not establish connection')
            || lastErrorMessage.includes('Receiving end does not exist')
          ) {
            reject(
              new Error(
                `无法连接目标扩展（ID: ${normalizedExtensionId}）。Chrome 原始错误：${lastErrorMessage}`,
              ),
            );
            return;
          }

          reject(
            new Error(
              `Quick Mock 调用失败（ID: ${normalizedExtensionId}）。Chrome 原始错误：${lastErrorMessage}`,
            ),
          );
          return;
        }

        if (!response || typeof response.status !== 'string' || typeof response.message !== 'string') {
          reject(new Error(`Quick Mock 调用失败（ID: ${normalizedExtensionId}）。未收到有效响应。`));
          return;
        }

        resolve(response);
      },
    );
  });
}

function subscribeToTabUpdates(
  messageType: RuntimeEventMessage['type'],
  listener: (tabId: number) => void,
): () => void {
  const handleMessage = (message: unknown) => {
    const runtimeMessage = message as RuntimeEventMessage;

    if (runtimeMessage?.type !== messageType) {
      return;
    }

    listener(runtimeMessage.tabId);
  };

  chrome.runtime.onMessage.addListener(handleMessage);

  return () => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  };
}

export function subscribeToTabRequestUpdates(
  listener: (tabId: number) => void,
): () => void {
  return subscribeToTabUpdates('quick-copy/tab-requests-updated', listener);
}

export function subscribeToPageErrorUpdates(
  listener: (tabId: number) => void,
): () => void {
  return subscribeToTabUpdates('quick-copy/page-errors-updated', listener);
}

export function subscribeToRecordingUpdates(
  listener: (tabId: number) => void,
): () => void {
  return subscribeToTabUpdates('quick-copy/recording-updated', listener);
}
