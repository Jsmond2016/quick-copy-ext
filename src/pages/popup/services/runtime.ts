import {
  ApifoxCacheStatus,
  ApifoxMatchResult,
  ApifoxMatchesResponse,
  ApifoxRefreshResponse,
  ApifoxStatusResponse,
  NetworkRequestRecord,
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

function isUnknownMessageTypeError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unknown message type.';
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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

export function subscribeToTabRequestUpdates(listener: (tabId: number) => void) {
  const handleMessage = (message: unknown) => {
    const runtimeMessage = message as RuntimeEventMessage;

    if (runtimeMessage?.type !== 'quick-copy/tab-requests-updated') {
      return;
    }

    listener(runtimeMessage.tabId);
  };

  chrome.runtime.onMessage.addListener(handleMessage);

  return () => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  };
}
