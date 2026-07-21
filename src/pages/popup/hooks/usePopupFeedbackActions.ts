import { useBoolean } from 'ahooks';
import {
  ApifoxCacheStatus,
  buildFeedbackText,
  buildWebOnlyText,
  dedupeBatchQuickMockUrls,
  getUrlAfterOrigin,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
  withRequestAbnormalState,
} from '@src/lib/quick-copy';
import { getErrorMessage, getTabRequests, sendBatchQuickMockToExtension } from '@pages/popup/services/runtime';

interface BuildCopyTextResult {
  count: number;
  text: string;
}

interface UsePopupFeedbackActionsOptions {
  apifoxStatus: ApifoxCacheStatus;
  attachApifoxUrls: (
    requests: NetworkRequestRecord[],
    apifoxStatus: ApifoxCacheStatus,
  ) => Promise<NetworkRequestRecord[]>;
  load: (settings: QuickCopySettings, apifoxStatus: ApifoxCacheStatus) => Promise<void>;
  note: string;
  page: PageSummary;
  requests: NetworkRequestRecord[];
  selectedIds: string[];
  selectedRequests: NetworkRequestRecord[];
  selectedTesterAioConfig: { bugUrl: string; iterationName: string } | null;
  setApifoxStatus: (status: ApifoxCacheStatus) => void;
  setErrorText: (value: string) => void;
  setRequests: (
    value: NetworkRequestRecord[] | ((current: NetworkRequestRecord[]) => NetworkRequestRecord[]),
  ) => void;
  setToast: (toast: { text: string; type: 'success' | 'error' | 'info' }) => void;
  settings: QuickCopySettings;
  tabId: number | null;
  includeRequestParams: boolean;
  refreshApifox: (
    exportUrl: string,
    authToken: string,
    messages: { fallbackErrorText: string },
    options: { onErrorText?: (message: string) => void },
  ) => Promise<ApifoxCacheStatus>;
}

interface UsePopupFeedbackActionsResult {
  copying: boolean;
  handleCopyToAio: () => Promise<void>;
  handleQuickMock: () => Promise<void>;
  handleRefreshApifox: () => Promise<void>;
  copyFeedback: () => Promise<void>;
  copyRequest: (request: NetworkRequestRecord) => Promise<void>;
  quickMocking: boolean;
}

export function usePopupFeedbackActions({
  apifoxStatus,
  attachApifoxUrls,
  includeRequestParams,
  load,
  note,
  page,
  requests,
  refreshApifox,
  selectedIds,
  selectedRequests,
  selectedTesterAioConfig,
  setApifoxStatus,
  setErrorText,
  setRequests,
  setToast,
  settings,
  tabId,
}: UsePopupFeedbackActionsOptions): UsePopupFeedbackActionsResult {
  const [copying, { setTrue: startCopying, setFalse: stopCopying }] = useBoolean(false);
  const [quickMocking, { setTrue: startQuickMocking, setFalse: stopQuickMocking }] = useBoolean(false);

  async function buildCopyText(): Promise<BuildCopyTextResult> {
    const latestRequests =
      tabId !== null
        ? (await attachApifoxUrls(await getTabRequests(tabId), apifoxStatus)).map((request) =>
            withRequestAbnormalState(request, settings.responseErrorRule),
          )
        : requests;
    setRequests(latestRequests);
    const requestsWithApifox = latestRequests.filter((request) => selectedIds.includes(request.id));
    const hasAbnormalRequest = requestsWithApifox.some(
      (request) => (request.abnormalReasons?.length ?? 0) > 0,
    );

    return {
      count: requestsWithApifox.length,
      text: buildFeedbackText({
        page,
        requests: requestsWithApifox,
        feedbackTitle: hasAbnormalRequest ? '存在接口状态或返回异常' : settings.feedbackTitle,
        note,
        screenshotLabel: '-',
        customFields: settings.customFields,
        includeRequestParams,
      }),
    };
  }

  async function copyFeedback(): Promise<void> {
    startCopying();
    setErrorText('');

    try {
      if (selectedIds.length === 0) {
        const text = buildWebOnlyText({
          page,
          feedbackTitle: settings.feedbackTitle,
          note,
          customFields: settings.customFields,
        });
        await navigator.clipboard.writeText(text);
        setToast({
          type: 'success',
          text: '复制成功，已写入 Web 信息。',
        });
      } else {
        const { count, text } = await buildCopyText();
        await navigator.clipboard.writeText(text);
        setToast({
          type: 'success',
          text: `复制成功，已写入 ${count} 条接口信息。`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败。';
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopCopying();
    }
  }

  async function copyRequest(request: NetworkRequestRecord): Promise<void> {
    const apiName = request.apiName?.trim();
    const text = `${request.method.toUpperCase()} ${getUrlAfterOrigin(request.url)}${apiName ? ` [${apiName}]` : ''}`;

    try {
      await navigator.clipboard.writeText(text);
      setToast({ type: 'success', text: '接口信息已复制到剪贴板' });
    } catch (error) {
      setToast({
        type: 'error',
        text: getErrorMessage(error, '复制接口信息失败。'),
      });
    }
  }

  async function handleCopyToAio(): Promise<void> {
    startCopying();
    setErrorText('');

    try {
      if (!selectedTesterAioConfig) {
        throw new Error('请先选择一个迭代名称。');
      }

      const { count, text } = await buildCopyText();
      await navigator.clipboard.writeText(text);
      await chrome.tabs.create({ url: selectedTesterAioConfig.bugUrl });
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${count} 条接口信息，并打开 ${selectedTesterAioConfig.iterationName}。`,
      });
    } catch (error) {
      const message = getErrorMessage(error, '复制至 AIO 失败。');
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopCopying();
    }
  }

  async function handleRefreshApifox(): Promise<void> {
    if (!settings.apifoxExportUrl) {
      setToast({
        type: 'info',
        text: '请先在设置中填写 Apifox 项目 ID。',
      });
      return;
    }

    if (!settings.apifoxAuthToken) {
      setToast({
        type: 'info',
        text: '请先在设置中填写 Apifox 授权令牌。',
      });
      return;
    }

    setErrorText('');

    try {
      const nextStatus = await refreshApifox(
        settings.apifoxExportUrl,
        settings.apifoxAuthToken,
        { fallbackErrorText: '刷新 Apifox 数据失败。' },
        { onErrorText: setErrorText },
      );
      setApifoxStatus(nextStatus);
      await load(settings, nextStatus);
      setToast({
        type: 'success',
        text: `Apifox 接口信息已刷新，共加载 ${nextStatus.endpointCount} 条接口。`,
      });
    } catch (error) {
      setToast({
        type: 'error',
        text: getErrorMessage(error, '刷新 Apifox 数据失败。'),
      });
    }
  }

  async function handleQuickMock(): Promise<void> {
    startQuickMocking();
    setErrorText('');

    try {
      if (!settings.quickMockTargetExtensionId) {
        throw new Error('请先在设置中填写 Quick Mock 扩展 ID。');
      }

      const urls = dedupeBatchQuickMockUrls(selectedRequests.map((request) => request.url));
      if (urls.length === 0) {
        throw new Error('当前没有可发送的接口 URL。');
      }

      const response = await sendBatchQuickMockToExtension(
        settings.quickMockTargetExtensionId,
        urls,
      );

      setToast({
        type: response.status === 'failed' ? 'error' : 'success',
        text: response.message,
      });
    } catch (error) {
      const message = getErrorMessage(error, '快速 mock 失败。');
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopQuickMocking();
    }
  }

  return {
    copying,
    copyFeedback,
    copyRequest,
    handleCopyToAio,
    handleQuickMock,
    handleRefreshApifox,
    quickMocking,
  };
}
