import { useEffect, useMemo, useState } from 'react';
import pkg from '../../../package.json';
import {
  buildFeedbackText,
  getDefaultSettings,
  isDefaultSettings,
  loadSettings,
  matchesMonitoredOrigins,
  matchesApiPrefixes,
  QuickCopySettings,
  saveSettings,
} from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { PopupHero } from '@pages/popup/components/PopupHero';
import { RequestHistoryPanel } from '@pages/popup/components/RequestHistoryPanel';
import { SettingsPanel } from '@pages/popup/components/SettingsPanel';
import { ConfigModal } from '@pages/popup/components/ConfigModal';
import { ToastMessage } from '@pages/popup/components/ToastMessage';
import { DEFAULT_APIFOX_STATUS } from '@pages/popup/constants';
import { useApifox } from '@pages/popup/hooks/useApifox';
import { useTabRequests } from '@pages/popup/hooks/useTabRequests';
import { useSelection } from '@pages/popup/hooks/useSelection';
import { useToast } from '@pages/popup/hooks/useToast';
import {
  clearApifoxData,
  getApifoxStatus,
  getErrorMessage,
  getTabRequests,
} from '@pages/popup/services/runtime';
import {
  buildSettingsFromForm,
  createSettingsFormState,
  getDefaultSettingsFormState,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

export default function Popup() {
  const versionText = `当前版本：v${pkg.version}`;
  const [note, setNote] = useState('');
  const [copying, setCopying] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(getDefaultSettingsFormState());
  const [includeRequestParams, setIncludeRequestParams] = useState(false);
  const [useQuickFill, setUseQuickFill] = useState(false);
  const [selectedQuickFillValues, setSelectedQuickFillValues] = useState<string[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalContent, setConfigModalContent] = useState('');
  const [configModalMode, setConfigModalMode] = useState<'import' | 'export'>('export');
  const {
    apifoxStatus,
    refreshingApifox,
    attachApifoxUrls,
    refresh: refreshApifox,
    setApifoxStatus,
    clearStatus: clearApifoxStatus,
  } = useApifox();
  const {
    page,
    requests,
    tabId,
    loading,
    statusText,
    errorText,
    load,
    clear: clearCurrentTabRequests,
    setRequests,
    setStatusText,
    setErrorText,
  } = useTabRequests(settings, apifoxStatus, attachApifoxUrls);
  const { toast, setToast } = useToast();

  const isDefaultConfig = useMemo(() => isDefaultSettings(settings), [settings]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesApiPrefixes(request.url, settings.apiPrefixes)),
    [requests, settings.apiPrefixes],
  );

  const pageMonitoringEnabled = useMemo(
    () => matchesMonitoredOrigins(page.url, settings.monitoredOrigins),
    [page.url, settings.monitoredOrigins],
  );
  const quickFillOptions = settings.quickFillTemplates;

  const {
    selectedIds,
    selectedRequests,
    toggleRequest,
    selectAll,
    clearSelection,
    setSelectedIds,
  } = useSelection(filteredRequests);

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
      await load(loadedSettings, currentApifoxStatus);
    })();
  }, []);

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

  function updateSettingsForm(field: keyof SettingsFormState, value: string) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNoteWithQuickFill(values: string[]) {
    setSelectedQuickFillValues(values);
    setNote(values.join('\n\n'));
  }

  async function copyFeedback() {
    setCopying(true);
    setErrorText('');

    try {
      const latestRequests =
        tabId !== null
          ? await attachApifoxUrls(await getTabRequests(tabId), apifoxStatus)
          : requests;
      setRequests(latestRequests);
      const requestsWithApifox = latestRequests.filter((request) => selectedIds.includes(request.id));
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
      setStatusText(`复制成功，已写入 ${requestsWithApifox.length} 条接口信息。`);
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${requestsWithApifox.length} 条接口信息。`,
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
      await load(nextSettings, DEFAULT_APIFOX_STATUS);

      if (nextSettings.apifoxExportUrl) {
        void refreshApifox(
          nextSettings.apifoxExportUrl,
          {
            successText: 'Apifox 接口信息已在后台刷新完成。',
            fallbackErrorText: '后台刷新 Apifox 数据失败。',
            toastOnSuccess: true,
            toastOnError: true,
            preserveStatusTextOnError: true,
          },
          {
            onStatusText: setStatusText,
            onToast: setToast,
            onErrorText: setErrorText,
          },
        ).then(async (nextStatus) => load(nextSettings, nextStatus))
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
      const nextStatus = await refreshApifox(
        settings.apifoxExportUrl,
        { fallbackErrorText: '刷新 Apifox 数据失败。' },
        { onErrorText: setErrorText },
      );
      await load(settings, nextStatus);
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
    clearApifoxStatus();
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
              onClearRequests={() => {
                void clearCurrentTabRequests();
                setSelectedIds([]);
              }}
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
        <ConfigModal
          mode={configModalMode}
          content={configModalContent}
          onContentChange={setConfigModalContent}
          onConfirm={handleConfigModalConfirm}
          onCopyExport={handleCopyExportConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      <div className="popup-version">{versionText}</div>
    </main>
  );
}
