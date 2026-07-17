import { useCallback, useEffect, useState } from 'react';
import { useDebounceFn, useUnmount } from 'ahooks';
import {
  buildPageErrorText,
  type NetworkRequestRecord,
  type PageErrorRecord,
  type PageSummary,
} from '@src/lib/quick-copy';
import {
  clearTabPageErrors,
  getErrorMessage,
  getTabPageErrors,
  subscribeToPageErrorUpdates,
} from '@pages/popup/services/runtime';
import type { ToastState } from '@pages/popup/types';

export function usePageErrors(
  tabId: number | null,
  page: PageSummary,
  requests: NetworkRequestRecord[],
  onFeedback: (toast: ToastState) => void,
) {
  const [pageErrors, setPageErrors] = useState<PageErrorRecord[]>([]);

  const load = useCallback(async (currentTabId: number) => {
    try {
      setPageErrors(await getTabPageErrors(currentTabId));
    } catch (error) {
      onFeedback({
        type: 'error',
        text: getErrorMessage(error, '读取页面异常失败。'),
      });
    }
  }, [onFeedback]);

  const clear = useCallback(async () => {
    if (tabId === null) {
      return;
    }

    try {
      await clearTabPageErrors(tabId);
      setPageErrors([]);
      onFeedback({ type: 'success', text: '页面异常记录已清空' });
    } catch (error) {
      onFeedback({
        type: 'error',
        text: getErrorMessage(error, '清空页面异常失败。'),
      });
    }
  }, [onFeedback, tabId]);

  const copy = useCallback(async (error: PageErrorRecord) => {
    try {
      await navigator.clipboard.writeText(buildPageErrorText(error, page, requests));
      onFeedback({ type: 'success', text: '页面异常信息已复制到剪贴板' });
    } catch (copyError) {
      onFeedback({
        type: 'error',
        text: getErrorMessage(copyError, '复制页面异常失败。'),
      });
    }
  }, [onFeedback, page, requests]);

  const { run: refresh, cancel } = useDebounceFn(load, { wait: 80 });
  useUnmount(cancel);

  useEffect(() => {
    if (tabId === null) {
      setPageErrors([]);
      return undefined;
    }

    void load(tabId);
    const unsubscribe = subscribeToPageErrorUpdates((updatedTabId) => {
      if (updatedTabId === tabId) {
        refresh(tabId);
      }
    });

    return () => {
      cancel();
      unsubscribe();
    };
  }, [cancel, load, refresh, tabId]);

  return { pageErrors, clear, copy };
}
