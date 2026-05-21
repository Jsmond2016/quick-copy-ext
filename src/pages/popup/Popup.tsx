import { useEffect, useMemo, useRef, useState } from 'react';
import pkg from '../../../package.json';
import {
  ApifoxCacheStatus,
  buildFeedbackText,
  getDefaultSettings,
  isDefaultSettings,
  loadSettings,
  matchesMonitoredOrigins,
  matchesApiPrefixes,
  NetworkRequestRecord,
  PageSummary,
  QuickCopySettings,
  saveSettings,
} from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
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
  subscribeToTabRequestUpdates,
} from '@pages/popup/services/runtime';
import {
  buildSettingsFromForm,
  createSettingsFormState,
  getDefaultSettingsFormState,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

export default function Popup() {
  const versionText = `当前版本：v${pkg.version}`;
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
  const [includeRequestParams, setIncludeRequestParams] = useState(false);
  const [useQuickFill, setUseQuickFill] = useState(false);
  const [selectedQuickFillValues, setSelectedQuickFillValues] = useState<string[]>([]);
  const [apifoxStatus, setApifoxStatus] = useState<ApifoxCacheStatus>(DEFAULT_APIFOX_STATUS);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalContent, setConfigModalContent] = useState('');
  const [configModalMode, setConfigModalMode] = useState<'import' | 'export'>('export');
  const { toast, setToast } = useToast();

  const isDefaultConfig = useMemo(() => isDefaultSettings(settings), [settings]);
  const lastClickedIndexRef = useRef<number | null>(null);

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
  const quickFillOptions = settings.quickFillTemplates;

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

  async function loadData(currentSettings = settings, currentApifoxStatus = apifoxStatus) {
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
      setSelectedIds((current) =>
        current.filter((id) => nextRequestsWithApifox.some((request) => request.id === id)),
      );
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
      setUseQuickFill(loadedSettings.quickFillTemplates.length > 0);
      const currentApifoxStatus = loadedSettings.apifoxExportUrl
        ? await getApifoxStatus()
        : DEFAULT_APIFOX_STATUS;
      setApifoxStatus(currentApifoxStatus);
      await loadData(loadedSettings, currentApifoxStatus);
    })();
  }, []);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRequests.some((request) => request.id === id)),
    );
  }, [filteredRequests]);

  useEffect(() => {
    setSelectedQuickFillValues((current) => {
      const nextValues = current.filter((item) => quickFillOptions.includes(item));

      if (useQuickFill && nextValues.length !== current.length) {
        setNote(nextValues.join('\n\n'));
      }

      return nextValues;
    });
  }, [quickFillOptions, useQuickFill]);

  useEffect(() => {
    if (quickFillOptions.length === 0 && useQuickFill) {
      setUseQuickFill(false);
    }
  }, [quickFillOptions.length, useQuickFill]);

  useEffect(() => {
    if (tabId === null) {
      return undefined;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshRequests = () => {
      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        void (async () => {
          try {
            const nextRequests = await getTabRequests(tabId);
            const nextRequestsWithApifox = await attachApifoxUrls(nextRequests, apifoxStatus);

            setRequests(nextRequestsWithApifox);
            setSelectedIds((current) =>
              current.filter((id) => nextRequestsWithApifox.some((request) => request.id === id)),
            );

            const isMonitoredPage = matchesMonitoredOrigins(page.url, settings.monitoredOrigins);
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
        })();
      }, 120);
    };

    const unsubscribe = subscribeToTabRequestUpdates((updatedTabId) => {
      if (updatedTabId !== tabId) {
        return;
      }

      refreshRequests();
    });

    return () => {
      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
      }
      unsubscribe();
    };
  }, [apifoxStatus, page.url, settings.monitoredOrigins, tabId]);

  function updateSettingsForm(field: keyof SettingsFormState, value: string) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleRequest(id: string, index: number, shiftKey: boolean) {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      setSelectedIds((current) => {
        const next = new Set(current);
        for (let i = start; i <= end; i++) {
          next.add(filteredRequests[i].id);
        }
        return Array.from(next);
      });
    } else {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    }
    lastClickedIndexRef.current = index;
  }

  function selectAll() {
    setSelectedIds(filteredRequests.map((request) => request.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function updateNoteWithQuickFill(values: string[]) {
    setSelectedQuickFillValues(values);
    setNote(values.join('\n\n'));
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
      const latestRequests =
        tabId !== null
          ? await attachApifoxUrls(await getTabRequests(tabId), apifoxStatus)
          : requests;
      const latestSelectedRequests = latestRequests.filter((request) => selectedIds.includes(request.id));

      setRequests(latestRequests);

      const apifoxMatches =
        apifoxStatus.ready && latestSelectedRequests.length > 0
          ? await getApifoxMatches(latestSelectedRequests.map(({ url, method }) => ({ url, method })))
          : {};
      const requestsWithApifox = latestSelectedRequests.map((request) => {
        const match = apifoxMatches[`${request.method.toUpperCase()} ${request.url}`];
        return {
          ...request,
          apifoxUrl: match?.apifoxUrl,
          apiName: match?.apiName,
        };
      });
      const hasAbnormalRequest = requestsWithApifox.some(
        (request) => (request.abnormalReasons?.length ?? 0) > 0,
      );

      const text = buildFeedbackText({
        page,
        requests: requestsWithApifox,
        feedbackTitle: hasAbnormalRequest ? '存在接口状态或返回异常' : settings.feedbackTitle,
        note,
        screenshotLabel: 'N/A',
        customFields: settings.customFields,
        includeRequestParams,
      });

      await navigator.clipboard.writeText(text);
      setStatusText(`复制成功，已写入 ${latestSelectedRequests.length} 条接口信息。`);
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${latestSelectedRequests.length} 条接口信息。`,
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

  async function handleSaveSettings(overrideForm?: SettingsFormState) {
    setSavingSettings(true);
    setErrorText('');

    try {
      const nextSettings = buildSettingsFromForm(overrideForm ?? settingsForm);

      if (!nextSettings.apifoxExportUrl) {
        await clearApifoxData();
        setApifoxStatus(DEFAULT_APIFOX_STATUS);
        setRequests((current) => current.map(({ apifoxUrl: _apifoxUrl, apiName: _apiName, ...request }) => request));
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
      await loadData(nextSettings, DEFAULT_APIFOX_STATUS);

      if (nextSettings.apifoxExportUrl) {
        void runApifoxRefresh(nextSettings.apifoxExportUrl, {
          successText: 'Apifox 接口信息已在后台刷新完成。',
          fallbackErrorText: '后台刷新 Apifox 数据失败。',
          toastOnSuccess: true,
          toastOnError: true,
          preserveStatusTextOnError: true,
        })
          .then(async (nextStatus) => loadData(nextSettings, nextStatus))
          .catch(() => undefined);
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
      await loadData(settings, nextStatus);
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

  function handleExport() {
    setConfigModalContent(JSON.stringify(settings, null, 2));
    setConfigModalMode('export');
    setShowConfigModal(true);
  }

  async function handleReset() {
    const defaults = getDefaultSettings();
    await saveSettings(defaults);
    await clearApifoxData();
    setSettings(defaults);
    setSettingsForm(createSettingsFormState(defaults));
    setApifoxStatus(DEFAULT_APIFOX_STATUS);
    setRequests((current) => current.map(({ apifoxUrl: _apifoxUrl, apiName: _apiName, ...request }) => request));
    setToast({ type: 'success', text: '配置已重置为默认值' });
  }

  function handleImport() {
    setConfigModalContent('');
    setConfigModalMode('import');
    setShowConfigModal(true);
  }

  function handleCopyExportConfig() {
    navigator.clipboard.writeText(configModalContent).catch(() => {});
    setShowConfigModal(false);
    setToast({ type: 'success', text: '配置已复制到剪贴板' });
  }

  async function handleConfigModalConfirm() {
    try {
      const parsed = JSON.parse(configModalContent) as QuickCopySettings;

      if (!parsed.monitoredOrigins || !parsed.apiPrefixes || !parsed.customFields) {
        throw new Error('缺少必要字段');
      }

      const nextSettings: QuickCopySettings = {
        feedbackTitle: parsed.feedbackTitle || getDefaultSettings().feedbackTitle,
        monitoredOrigins: Array.isArray(parsed.monitoredOrigins) ? parsed.monitoredOrigins : [],
        apiPrefixes: Array.isArray(parsed.apiPrefixes) ? parsed.apiPrefixes : [],
        customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
        quickFillTemplates: Array.isArray(parsed.quickFillTemplates) ? parsed.quickFillTemplates : [],
        apifoxExportUrl: typeof parsed.apifoxExportUrl === 'string' ? parsed.apifoxExportUrl : '',
        responseErrorRule: typeof parsed.responseErrorRule === 'string' ? parsed.responseErrorRule : getDefaultSettings().responseErrorRule,
      };

      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setSettingsForm(createSettingsFormState(nextSettings));
      setShowConfigModal(false);
      setToast({ type: 'success', text: '配置导入成功' });
    } catch {
      setToast({ type: 'error', text: '配置格式错误，请检查 JSON' });
    }
  }

  return (
    <main className="popup-shell">
      <ToastMessage toast={toast} />

      <PopupHero
        apifoxExportUrl={settings.apifoxExportUrl}
        apifoxStatus={apifoxStatus}
        page={page}
        pageMonitoringEnabled={pageMonitoringEnabled}
        refreshingApifox={refreshingApifox}
        showSettings={showSettings}
        onRefreshApifox={() => void handleRefreshApifox()}
        onToggleSettings={() => setShowSettings((current) => !current)}
      />

      {showSettings ? (
        <SettingsPanel
          form={settingsForm}
          savingSettings={savingSettings}
          isDefaultConfig={isDefaultConfig}
          onCancel={() => setShowSettings(false)}
          onFieldChange={updateSettingsForm}
          onSave={() => void handleSaveSettings()}
          onReset={handleReset}
          onImport={handleImport}
          onExport={handleExport}
        />
      ) : (
        <>
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
            includeRequestParams={includeRequestParams}
            onCopy={() => void copyFeedback()}
            quickFillOptions={quickFillOptions}
            useQuickFill={useQuickFill}
            selectedQuickFillValues={selectedQuickFillValues}
            onNoteChange={setNote}
            onToggleRequestParams={() => setIncludeRequestParams((v) => !v)}
            onToggleQuickFill={() => {
              setUseQuickFill((current) => !current);
            }}
            onQuickFillSelectionChange={updateNoteWithQuickFill}
          />
        </>
      )}

      {showConfigModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowConfigModal(false)}>
          <div
            className="panel"
            style={{
              width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12,
              padding: 20, borderRadius: 22, border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {configModalMode === 'import' ? '导入配置' : '导出配置'}
            </h3>
            <textarea
              style={{
                width: '100%', minHeight: 300, fontFamily: 'monospace',
                fontSize: 13, padding: 8, boxSizing: 'border-box', resize: 'vertical',
                border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)',
              }}
              readOnly={configModalMode === 'export'}
              value={configModalContent}
              onChange={(e) => setConfigModalContent(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {configModalMode === 'import' && (
                <button className="primary-button compact" onClick={handleConfigModalConfirm} type="button">
                  确认导入
                </button>
              )}
              {configModalMode === 'export' && (
                <button className="primary-button compact" onClick={handleCopyExportConfig} type="button">
                  复制
                </button>
              )}
              <button className="ghost-button" onClick={() => setShowConfigModal(false)} type="button">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="popup-version">{versionText}</div>
    </main>
  );
}
