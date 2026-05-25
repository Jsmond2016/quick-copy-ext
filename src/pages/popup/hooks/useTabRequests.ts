import { useCallback, useEffect, useState } from 'react';
import { useDebounceFn, useLatest, useUnmount } from 'ahooks';
import {
  ApifoxCacheStatus,
  matchesMonitoredOrigins,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
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
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('正在读取当前页面请求记录...');
  const [errorText, setErrorText] = useState('');
  const pageRef = useLatest(page);
  const settingsRef = useLatest(settings);

  const load = useCallback(async (
    currentSettings: QuickCopySettings,
    currentApifoxStatus: ApifoxCacheStatus,
  ) => {
    setLoading(true);
    setErrorText('');
    setStatusText('正在读取当前页面请求记录...');

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
      setRequests(nextRequestsWithApifox);

      const nextPageUrl = tab.url ?? '';
      const isMonitoredPage = matchesMonitoredOrigins(nextPageUrl, currentSettings.monitoredOrigins);
      setStatusText(
        nextRequestsWithApifox.length > 0
          ? `已加载 ${nextRequestsWithApifox.length} 条接口记录，可勾选后复制。`
          : isMonitoredPage
            ? ''
            : '当前页面不在监听 Origin 范围内，插件不会记录接口请求。',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取请求记录失败。';
      setRequests([]);
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }, [attachApifoxUrls]);

  const clear = useCallback(async () => {
    if (tabId === null) {
      return;
    }

    setLoading(true);
    setErrorText('');
    setStatusText('正在清空当前标签页记录...');

    try {
      await clearTabRequests(tabId);
      setRequests([]);
      setStatusText('当前标签页记录已清空。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '清空记录失败。';
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }, [tabId]);

  const { run: refreshRequests, cancel: cancelRefreshRequests } = useDebounceFn(
    async (currentTabId: number) => {
      try {
        const nextRequests = await getTabRequests(currentTabId);
        const nextRequestsWithApifox = await attachApifoxUrls(nextRequests, apifoxStatus);

        setRequests(nextRequestsWithApifox);

        const currentPage = pageRef.current;
        const currentSettings = settingsRef.current;
        const isMonitoredPage = matchesMonitoredOrigins(currentPage.url, currentSettings.monitoredOrigins);
        setStatusText(
          nextRequestsWithApifox.length > 0
            ? `已加载 ${nextRequestsWithApifox.length} 条接口记录，可勾选后复制。`
            : isMonitoredPage
              ? ''
              : '当前页面不在监听 Origin 范围内，插件不会记录接口请求。',
        );
        setErrorText('');
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取请求记录失败。';
        setErrorText(message);
        setStatusText(message);
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
    loading,
    statusText,
    errorText,
    load,
    clear,
    setRequests,
    setTabId,
    setStatusText,
    setErrorText,
  };
}
