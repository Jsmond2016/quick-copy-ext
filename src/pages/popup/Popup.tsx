import { useEffect, useMemo, useState } from 'react';
import {
  ApifoxCacheStatus,
  buildFeedbackText,
  getDefaultSettings,
  loadSettings,
  matchesMonitoredOrigins,
  matchesApiPrefixes,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
  saveSettings,
} from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { PageSummaryPanel } from '@pages/popup/components/PageSummaryPanel';
import { PopupHero } from '@pages/popup/components/PopupHero';
import { RequestHistoryPanel } from '@pages/popup/components/RequestHistoryPanel';
import { SettingsPanel } from '@pages/popup/components/SettingsPanel';
import { ToastMessage } from '@pages/popup/components/ToastMessage';
import { DEFAULT_APIFOX_STATUS, DEFAULT_PAGE } from '@pages/popup/constants';
import { useToast } from '@pages/popup/hooks/useToast';
import {
  clearApifoxData,
  clearTabRequests,
  getActiveTab,
  getApifoxMatches,
  getApifoxStatus,
  getErrorMessage,
  getTabRequests,
  refreshApifoxData,
} from '@pages/popup/services/runtime';
import {
  buildSettingsFromForm,
  createSettingsFormState,
  getDefaultSettingsFormState,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

export default function Popup() {
  const [page, setPage] = useState<PageSummary>(DEFAULT_PAGE);
  const [requests, setRequests] = useState<NetworkRequestRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [tabId, setTabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshingApifox, setRefreshingApifox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusText, setStatusText] = useState('正在读取当前页面请求记录...');
  const [errorText, setErrorText] = useState('');
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(getDefaultSettingsFormState());
  const [apifoxStatus, setApifoxStatus] = useState<ApifoxCacheStatus>(DEFAULT_APIFOX_STATUS);
  const { toast, setToast } = useToast();

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesApiPrefixes(request.url, settings.apiPrefixes)),
    [requests, settings.apiPrefixes],
  );

  const selectedRequests = useMemo(
    () => filteredRequests.filter((request) => selectedIds.includes(request.id)),
    [filteredRequests, selectedIds],
  );
  const pageMonitoringEnabled = useMemo(
    () => matchesMonitoredOrigins(page.url, settings.monitoredOrigins),
    [page.url, settings.monitoredOrigins],
  );

  async function loadData(currentSettings = settings) {
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
      setRequests(nextRequests);
      setSelectedIds((current) =>
        current.filter((id) => nextRequests.some((request) => request.id === id)),
      );
      const nextPageUrl = tab.url ?? '';
      const isMonitoredPage = matchesMonitoredOrigins(nextPageUrl, currentSettings.monitoredOrigins);
      setStatusText(
        nextRequests.length > 0
          ? `已加载 ${nextRequests.length} 条接口记录，可勾选后复制。`
          : isMonitoredPage
            ? ''
            : '当前页面不在监听 Origin 范围内，插件不会记录接口请求。',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取请求记录失败。';
      setRequests([]);
      setSelectedIds([]);
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
      setSettingsForm(createSettingsFormState(loadedSettings));
      const currentApifoxStatus = loadedSettings.apifoxExportUrl
        ? await getApifoxStatus()
        : DEFAULT_APIFOX_STATUS;
      setApifoxStatus(currentApifoxStatus);
      await loadData(loadedSettings);
    })();
  }, []);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRequests.some((request) => request.id === id)),
    );
  }, [filteredRequests]);

  function updateSettingsForm(field: keyof SettingsFormState, value: string) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleRequest(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectAll() {
    setSelectedIds(filteredRequests.map((request) => request.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function runApifoxRefresh(
    exportUrl: string,
    options?: {
      successText?: string;
      fallbackErrorText?: string;
      preserveStatusTextOnError?: boolean;
      toastOnSuccess?: boolean;
      toastOnError?: boolean;
    },
  ) {
    setRefreshingApifox(true);

    try {
      const nextStatus = await refreshApifoxData(exportUrl);
      setApifoxStatus(nextStatus);

      if (options?.successText) {
        setStatusText(options.successText);
      }

      if (options?.toastOnSuccess && options.successText) {
        setToast({
          type: 'success',
          text: options.successText,
        });
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
      setErrorText(message);

      if (!options?.preserveStatusTextOnError) {
        setStatusText(message);
      }

      if (options?.toastOnError) {
        setToast({ type: 'error', text: message });
      }

      throw error;
    } finally {
      setRefreshingApifox(false);
    }
  }

  async function clearCurrentTabRequests() {
    if (tabId === null) {
      return;
    }

    setLoading(true);
    setErrorText('');
    setStatusText('正在清空当前标签页记录...');

    try {
      await clearTabRequests(tabId);
      setRequests([]);
      setSelectedIds([]);
      setStatusText('当前标签页记录已清空。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '清空记录失败。';
      setErrorText(message);
      setStatusText(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyFeedback() {
    setCopying(true);
    setErrorText('');

    try {
      const apifoxMatches =
        apifoxStatus.ready && selectedRequests.length > 0
          ? await getApifoxMatches(selectedRequests.map(({ url, method }) => ({ url, method })))
          : {};
      const requestsWithApifox = selectedRequests.map((request) => ({
        ...request,
        apifoxUrl: apifoxMatches[`${request.method.toUpperCase()} ${request.url}`],
      }));

      const text = buildFeedbackText({
        page,
        requests: requestsWithApifox,
        feedbackTitle: settings.feedbackTitle,
        note,
        screenshotLabel: 'N/A',
        customFields: settings.customFields,
      });

      await navigator.clipboard.writeText(text);
      setStatusText(`复制成功，已写入 ${selectedRequests.length} 条接口信息。`);
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${selectedRequests.length} 条接口信息。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败。';
      setErrorText(message);
      setStatusText(message);
      setToast({ type: 'error', text: message });
    } finally {
      setCopying(false);
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setErrorText('');

    try {
      const nextSettings = buildSettingsFromForm(settingsForm);

      if (!nextSettings.apifoxExportUrl) {
        await clearApifoxData();
        setApifoxStatus(DEFAULT_APIFOX_STATUS);
      } else {
        setApifoxStatus({
          ready: false,
          sourceUrl: nextSettings.apifoxExportUrl,
          endpointCount: 0,
        });
      }

      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setSettingsForm(createSettingsFormState(nextSettings));
      const savedStatusText = nextSettings.apifoxExportUrl
        ? '配置已保存，监听范围与筛选规则已生效，Apifox 接口信息正在后台刷新。'
        : '配置已保存，新的监听范围、过滤规则与 Apifox 设置已生效。';
      setStatusText(savedStatusText);
      setToast({
        type: 'info',
        text: nextSettings.apifoxExportUrl
          ? '配置已保存，Apifox 接口信息正在后台刷新。'
          : '配置已保存，监听范围已更新，且已清空 Apifox 缓存。',
      });
      setShowSettings(false);
      await loadData(nextSettings);

      if (nextSettings.apifoxExportUrl) {
        void runApifoxRefresh(nextSettings.apifoxExportUrl, {
          successText: 'Apifox 接口信息已在后台刷新完成。',
          fallbackErrorText: '后台刷新 Apifox 数据失败。',
          toastOnSuccess: true,
          toastOnError: true,
          preserveStatusTextOnError: true,
        }).catch(() => undefined);
      }
    } catch (error) {
      const message = getErrorMessage(error, '保存配置失败。');
      setErrorText(message);
      setStatusText(message);
      setToast({ type: 'error', text: message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleRefreshApifox() {
    if (!settings.apifoxExportUrl) {
      setToast({
        type: 'info',
        text: '请先在设置中填写本地 Apifox 导出地址。',
      });
      setShowSettings(true);
      return;
    }

    setErrorText('');
    setStatusText('正在刷新 Apifox 接口信息...');

    try {
      const nextStatus = await runApifoxRefresh(settings.apifoxExportUrl, {
        fallbackErrorText: '刷新 Apifox 数据失败。',
      });
      const successText = `Apifox 接口信息已刷新，共加载 ${nextStatus.endpointCount} 条接口。`;
      setStatusText(successText);
      setToast({
        type: 'success',
        text: successText,
      });
    } catch (error) {
      const message = getErrorMessage(error, '刷新 Apifox 数据失败。');
      setToast({ type: 'error', text: message });
    }
  }

  return (
    <main className="popup-shell">
      <ToastMessage toast={toast} />

      <PopupHero
        apifoxExportUrl={settings.apifoxExportUrl}
        apifoxStatus={apifoxStatus}
        refreshingApifox={refreshingApifox}
        showSettings={showSettings}
        onRefreshApifox={() => void handleRefreshApifox()}
        onToggleSettings={() => setShowSettings((current) => !current)}
      />

      {showSettings ? (
        <SettingsPanel
          form={settingsForm}
          savingSettings={savingSettings}
          onCancel={() => setShowSettings(false)}
          onFieldChange={updateSettingsForm}
          onSave={() => void handleSaveSettings()}
        />
      ) : (
        <>
          <PageSummaryPanel
            page={page}
            pageMonitoringEnabled={pageMonitoringEnabled}
            onRefresh={() => void loadData()}
          />

          {pageMonitoringEnabled ? (
            <RequestHistoryPanel
              errorText={errorText}
              filteredRequests={filteredRequests}
              loading={loading}
              requests={requests}
              selectedIds={selectedIds}
              settings={settings}
              statusText={statusText}
              onClearRequests={() => void clearCurrentTabRequests()}
              onClearSelection={clearSelection}
              onSelectAll={selectAll}
              onToggleRequest={toggleRequest}
            />
          ) : null}

          <NotePanel
            copying={copying}
            note={note}
            selectedCount={selectedRequests.length}
            onCopy={() => void copyFeedback()}
            onNoteChange={setNote}
          />
        </>
      )}
    </main>
  );
}
