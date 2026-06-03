import { useState } from 'react';
import { ApifoxCacheStatus, NetworkRequestRecord } from '@src/lib/quick-copy';
import { DEFAULT_APIFOX_STATUS } from '@pages/popup/constants';
import {
  getApifoxMatches,
  getErrorMessage,
  refreshApifoxData as refreshApifoxService,
} from '@pages/popup/services/runtime';

interface RefreshOptions {
  successText?: string;
  fallbackErrorText?: string;
  toastOnSuccess?: boolean;
  toastOnError?: boolean;
}

interface StatusCallbacks {
  onErrorText?: (text: string) => void;
  onToast?: (toast: { type: 'success' | 'info' | 'error'; text: string }) => void;
}

export function useApifox() {
  const [apifoxStatus, setApifoxStatus] = useState<ApifoxCacheStatus>(DEFAULT_APIFOX_STATUS);
  const [refreshingApifox, setRefreshingApifox] = useState(false);

  async function attachApifoxUrls(
    nextRequests: NetworkRequestRecord[],
    currentApifoxStatus = apifoxStatus,
  ): Promise<NetworkRequestRecord[]> {
    if (!currentApifoxStatus.ready || nextRequests.length === 0) {
      return nextRequests.map(({ apifoxUrl: _apifoxUrl, apiName: _apiName, ...request }) => request);
    }

    const apifoxMatches = await getApifoxMatches(nextRequests.map(({ url, method }) => ({ url, method })));

    return nextRequests.map((request) => {
      const match = apifoxMatches[`${request.method.toUpperCase()} ${request.url}`];
      return {
        ...request,
        apifoxUrl: match?.apifoxUrl,
        apiName: match?.apiName,
      };
    });
  }

  async function refresh(
    exportUrl: string,
    options?: RefreshOptions,
    callbacks?: StatusCallbacks,
  ): Promise<ApifoxCacheStatus> {
    setRefreshingApifox(true);

    try {
      const nextStatus = await refreshApifoxService(exportUrl);
      setApifoxStatus(nextStatus);

      if (options?.toastOnSuccess && options.successText) {
        callbacks?.onToast?.({ type: 'success', text: options.successText });
      }

      return nextStatus;
    } catch (error) {
      const message = getErrorMessage(error, options?.fallbackErrorText ?? '刷新 Apifox 数据失败。');
      setApifoxStatus({
        ready: false,
        sourceUrl: exportUrl.trim(),
        endpointCount: 0,
        error: message,
      });

      callbacks?.onErrorText?.(message);

      if (options?.toastOnError) {
        callbacks?.onToast?.({ type: 'error', text: message });
      }

      throw error;
    } finally {
      setRefreshingApifox(false);
    }
  }

  function clearStatus() {
    setApifoxStatus(DEFAULT_APIFOX_STATUS);
  }

  return {
    apifoxStatus,
    refreshingApifox,
    attachApifoxUrls,
    refresh,
    setApifoxStatus,
    clearStatus,
  };
}
