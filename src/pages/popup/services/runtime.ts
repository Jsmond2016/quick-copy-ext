import {
  ApifoxCacheStatus,
  ApifoxMatchesResponse,
  ApifoxRefreshResponse,
  ApifoxStatusResponse,
  NetworkRequestRecord,
  RuntimeEventMessage,
  RuntimeResponseMessage,
} from '@src/lib/quick-copy';
import { DEFAULT_APIFOX_STATUS } from '@pages/popup/constants';

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

export async function refreshApifoxData(exportUrl: string): Promise<ApifoxCacheStatus> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'quick-copy/refresh-apifox-data',
      exportUrl,
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
): Promise<Record<string, string>> {
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

const SESSION_STORAGE_QUOTA = 10_485_760;
const STORAGE_WARNING_THRESHOLD = 0.8;

export async function getSessionStorageUsage(): Promise<{ bytesInUse: number; quota: number; ratio: number }> {
  const bytesInUse = await chrome.storage.session.getBytesInUse(null);
  return {
    bytesInUse,
    quota: SESSION_STORAGE_QUOTA,
    ratio: bytesInUse / SESSION_STORAGE_QUOTA,
  };
}

export function isStorageNearCapacity(ratio: number): boolean {
  return ratio >= STORAGE_WARNING_THRESHOLD;
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
