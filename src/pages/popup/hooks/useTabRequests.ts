import { useCallback, useEffect, useState } from 'react';
import { useDebounceFn, useLatest, useUnmount } from 'ahooks';
import {
  ApifoxCacheStatus,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
  withRequestAbnormalState,
} from '@src/lib/quick-copy';
import { DEFAULT_PAGE } from '@pages/popup/constants';
import {
  clearTabRequests,
  getActiveTab,
  getTabRequests,
  subscribeToTabRequestUpdates,
} from '@pages/popup/services/runtime';

export function useTabRequests(
  settings: QuickCopySettings,
  apifoxStatus: ApifoxCacheStatus,
  attachApifoxUrls: (
    requests: NetworkRequestRecord[],
    currentApifoxStatus?: ApifoxCacheStatus,
  ) => Promise<NetworkRequestRecord[]>,
) {
  const [page, setPage] = useState<PageSummary>(DEFAULT_PAGE);
  const [requests, setRequests] = useState<NetworkRequestRecord[]>([]);
  const [tabId, setTabId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
  const settingsRef = useLatest(settings);

  function applyCurrentResponseRules(
    requestList: NetworkRequestRecord[],
    currentSettings: QuickCopySettings,
  ) {
    return requestList.map((request) =>
      withRequestAbnormalState(request, currentSettings.responseErrorRule),
    );
  }

  const load = useCallback(async (
    currentSettings: QuickCopySettings,
    currentApifoxStatus: ApifoxCacheStatus,
  ) => {
    setErrorText('');

    try {
      const tab = await getActiveTab();

      if (!tab?.id) {
        throw new Error('未获取到当前标签页，请在普通网页中打开插件。');
      }

      setTabId(tab.id);
      setPage({
        title: tab.title ?? '',
        url: tab.url ?? '',
      });

      const nextRequests = await getTabRequests(tab.id);
      const nextRequestsWithApifox = await attachApifoxUrls(nextRequests, currentApifoxStatus);
      const nextRequestsWithRules = applyCurrentResponseRules(
        nextRequestsWithApifox,
        currentSettings,
      );
      setRequests(nextRequestsWithRules);
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取请求记录失败。';
      setRequests([]);
      setErrorText(message);
    }
  }, [attachApifoxUrls]);

  const clear = useCallback(async () => {
    if (tabId === null) {
      return;
    }

    setErrorText('');

    try {
      await clearTabRequests(tabId);
      setRequests([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '清空记录失败。';
      setErrorText(message);
    }
  }, [tabId]);

  const { run: refreshRequests, cancel: cancelRefreshRequests } = useDebounceFn(
    async (currentTabId: number) => {
      try {
        const nextRequests = await getTabRequests(currentTabId);
        const nextRequestsWithApifox = await attachApifoxUrls(nextRequests, apifoxStatus);
        const nextRequestsWithRules = applyCurrentResponseRules(
          nextRequestsWithApifox,
          settingsRef.current,
        );

        setRequests(nextRequestsWithRules);
        setErrorText('');
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取请求记录失败。';
        setErrorText(message);
      }
    },
    { wait: 120 },
  );

  useUnmount(cancelRefreshRequests);

  useEffect(() => {
    const currentTabId = tabId;
    if (currentTabId === null) {
      return undefined;
    }

    const unsubscribe = subscribeToTabRequestUpdates((updatedTabId) => {
      if (updatedTabId !== currentTabId) {
        return;
      }

      refreshRequests(currentTabId);
    });

    return () => {
      cancelRefreshRequests();
      unsubscribe();
    };
  }, [cancelRefreshRequests, refreshRequests, tabId]);

  return {
    page,
    requests,
    tabId,
    errorText,
    load,
    clear,
    setRequests,
    setTabId,
    setErrorText,
  };
}
