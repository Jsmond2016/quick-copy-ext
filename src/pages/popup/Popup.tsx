import { useMemo, useState } from 'react';
import { useBoolean, useMount, useRequest, useUpdateEffect } from 'ahooks';
import pkg from '../../../package.json';
import {
  buildFeedbackText,
  dedupeBatchQuickMockUrls,
  getDefaultSettings,
  isDefaultSettings,
  isValidResponseErrorRuleConfig,
  loadSettings,
  matchesMonitoredOrigins,
  matchesApiPrefixes,
  QuickCopyMode,
  QuickCopySettings,
  TesterAioConfig,
  saveSettings,
  withRequestAbnormalState,
} from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { PopupHero } from '@pages/popup/components/PopupHero';
import { RequestParamsPanel } from '@pages/popup/components/RequestParamsPanel';
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
  sendBatchQuickMockToExtension,
} from '@pages/popup/services/runtime';
import {
  buildSettingsFromForm,
  createPortableSettingsConfig,
  createSettingsFormState,
  getDefaultSettingsFormState,
  parsePortableSettingsConfig,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

const POPUP_FOOTER_LINKS = [
  {
    label: '更新日志',
    href: 'https://github.com/Jsmond2016/quick-copy-ext/blob/main/CHANGELOG.md',
    title: 'quick-copy-ext/CHANGELOG.md at main · Jsmond2016/quick-copy-ext',
  },
  {
    label: 'quick-copy-ext',
    href: 'https://github.com/Jsmond2016/quick-copy-ext',
    title: 'GitHub - Jsmond2016/quick-copy-ext: 在 web 页面中快速复制接口信息，用于反馈给开发和测试',
  },
  {
    label: 'Jsmond2016',
    href: 'https://github.com/Jsmond2016',
    title: 'Jsmond2016 - Overview',
  },
] as const;

export default function Popup() {
  const versionText = `当前版本：v${pkg.version}`;
  const [note, setNote] = useState('');
  const [copying, { setTrue: startCopying, setFalse: stopCopying }] = useBoolean(false);
  const [quickMocking, { setTrue: startQuickMocking, setFalse: stopQuickMocking }] = useBoolean(false);
  const [savingSettings, { setTrue: startSavingSettings, setFalse: stopSavingSettings }] = useBoolean(false);
  const [showSettings, { toggle: toggleShowSettings, setTrue: openSettings, setFalse: closeSettings }] = useBoolean(false);
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(getDefaultSettingsFormState());
  const [includeRequestParams, { toggle: toggleIncludeRequestParams }] = useBoolean(true);
  const [useQuickFill, { toggle: toggleUseQuickFill, setFalse: disableQuickFill, set: setUseQuickFill }] = useBoolean(false);
  const [selectedQuickFillValues, setSelectedQuickFillValues] = useState<string[]>([]);
  const [selectedTesterAioConfigId, setSelectedTesterAioConfigId] = useState('');
  const [showConfigModal, { setTrue: openConfigModal, setFalse: closeConfigModal }] = useBoolean(false);
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
    errorText,
    load,
    clear: clearCurrentTabRequests,
    setRequests,
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
  const selectedTesterAioConfig = useMemo(
    () => settings.testerAioConfigs.find((item) => item.id === selectedTesterAioConfigId) ?? null,
    [selectedTesterAioConfigId, settings.testerAioConfigs],
  );

  const {
    selectedIds,
    selectedRequests,
    toggleRequest,
    selectAll,
    clearSelection,
    setSelectedIds,
  } = useSelection(filteredRequests);

  const { runAsync: initializePopup } = useRequest(
    async () => {
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
      setSettingsForm(createSettingsFormState(loadedSettings));
      setUseQuickFill(loadedSettings.quickFillTemplates.length > 0);
      setSelectedTesterAioConfigId(loadedSettings.testerAioConfigs[0]?.id ?? '');
      const currentApifoxStatus = loadedSettings.apifoxExportUrl
        ? await getApifoxStatus()
        : DEFAULT_APIFOX_STATUS;
      setApifoxStatus(currentApifoxStatus);
      await load(loadedSettings, currentApifoxStatus);
    },
    {
      manual: true,
      onError: (error) => {
        const message = getErrorMessage(error, '初始化插件失败。');
        setErrorText(message);
        setToast({ type: 'error', text: message });
      },
    },
  );

  useMount(() => {
    void initializePopup();
  });

  useUpdateEffect(() => {
    setSelectedQuickFillValues((current) => {
      const nextValues = current.filter((item) => quickFillOptions.includes(item));

      if (useQuickFill && nextValues.length !== current.length) {
        setNote(nextValues.join('\n\n'));
      }

      return nextValues;
    });
  }, [quickFillOptions, useQuickFill]);

  useUpdateEffect(() => {
    if (quickFillOptions.length === 0 && useQuickFill) {
      disableQuickFill();
    }
  }, [quickFillOptions.length, useQuickFill]);

  useUpdateEffect(() => {
    if (settings.mode !== 'tester' || settings.testerAioConfigs.length === 0) {
      if (selectedTesterAioConfigId) {
        setSelectedTesterAioConfigId('');
      }
      return;
    }

    const matchedConfig = settings.testerAioConfigs.some((item) => item.id === selectedTesterAioConfigId);
    if (!matchedConfig) {
      setSelectedTesterAioConfigId(settings.testerAioConfigs[0]?.id ?? '');
    }
  }, [selectedTesterAioConfigId, settings.mode, settings.testerAioConfigs]);

  function updateSettingsForm(field: keyof SettingsFormState, value: string) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMode(mode: QuickCopyMode) {
    setSettingsForm((current) => ({
      ...current,
      mode,
      testerAioConfigs:
        mode === 'tester' && current.testerAioConfigs.length === 0
          ? [createEmptyTesterAioConfig()]
          : current.testerAioConfigs,
    }));
  }

  function createEmptyTesterAioConfig(): TesterAioConfig {
    return {
      id: crypto.randomUUID?.() ?? `aio-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      iterationName: '',
      bugUrl: '',
    };
  }

  function updateTesterAioConfig(
    index: number,
    field: 'iterationName' | 'bugUrl',
    value: string,
  ) {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: current.testerAioConfigs.map((item, currentIndex) => (
        currentIndex === index
          ? { ...item, [field]: value }
          : item
      )),
    }));
  }

  function addTesterAioConfig() {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: [...current.testerAioConfigs, createEmptyTesterAioConfig()],
    }));
  }

  function removeTesterAioConfig(index: number) {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: current.testerAioConfigs.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function moveTesterAioConfig(index: number, direction: 'up' | 'down') {
    setSettingsForm((current) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.testerAioConfigs.length) {
        return current;
      }

      const nextConfigs = [...current.testerAioConfigs];
      const [movedItem] = nextConfigs.splice(index, 1);
      nextConfigs.splice(targetIndex, 0, movedItem);

      return {
        ...current,
        testerAioConfigs: nextConfigs,
      };
    });
  }

  function updateNoteWithQuickFill(values: string[]) {
    setSelectedQuickFillValues(values);
    setNote(values.join('\n\n'));
  }

  async function buildCopyText() {
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
        screenshotLabel: 'N/A',
        customFields: settings.customFields,
        includeRequestParams,
      }),
    };
  }

  async function copyFeedback() {
    startCopying();
    setErrorText('');

    try {
      const { count, text } = await buildCopyText();

      await navigator.clipboard.writeText(text);
      setToast({
        type: 'success',
        text: `复制成功，已写入 ${count} 条接口信息。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败。';
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopCopying();
    }
  }

  async function handleCopyToAio() {
    startCopying();
    setErrorText('');

    try {
      if (!selectedTesterAioConfig) {
        throw new Error('请先选择一个迭代名称。');
      }

      const { count, text } = await buildCopyText();
      await navigator.clipboard.writeText(text);
      await chrome.tabs.create({ url: selectedTesterAioConfig.bugUrl });
      const successText = `复制成功，已写入 ${count} 条接口信息，并打开 ${selectedTesterAioConfig.iterationName}。`;
      setToast({
        type: 'success',
        text: successText,
      });
    } catch (error) {
      const message = getErrorMessage(error, '复制至 AIO 失败。');
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopCopying();
    }
  }

  async function handleSaveSettings(overrideForm?: SettingsFormState) {
    startSavingSettings();
    setErrorText('');

    try {
      const nextSettings = buildSettingsFromForm(overrideForm ?? settingsForm);

      if (!isValidResponseErrorRuleConfig(nextSettings.responseErrorRule)) {
        throw new Error('异常响应规则格式错误，请检查 JSON 数组和表达式写法。');
      }

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
      setSelectedTesterAioConfigId(nextSettings.testerAioConfigs[0]?.id ?? '');
      setToast({
        type: 'info',
        text: nextSettings.apifoxExportUrl
          ? '配置已保存，Apifox 接口信息正在后台刷新。'
          : '配置已保存，监听范围已更新，且已清空 Apifox 缓存。',
      });
      closeSettings();
      await load(nextSettings, DEFAULT_APIFOX_STATUS);

      if (nextSettings.apifoxExportUrl) {
        void refreshApifox(
          nextSettings.apifoxExportUrl,
          {
            successText: 'Apifox 接口信息已在后台刷新完成。',
            fallbackErrorText: '后台刷新 Apifox 数据失败。',
            toastOnSuccess: true,
            toastOnError: true,
          },
          {
            onToast: setToast,
            onErrorText: setErrorText,
          },
        ).then(async (nextStatus) => load(nextSettings, nextStatus))
          .catch(() => undefined);
      }
    } catch (error) {
      const message = getErrorMessage(error, '保存配置失败。');
      setErrorText(message);
      setToast({ type: 'error', text: message });
    } finally {
      stopSavingSettings();
    }
  }

  async function handleRefreshApifox() {
    if (!settings.apifoxExportUrl) {
      setToast({
        type: 'info',
        text: '请先在设置中填写 Apifox 项目 ID。',
      });
      openSettings();
      return;
    }

    setErrorText('');

    try {
      const nextStatus = await refreshApifox(
        settings.apifoxExportUrl,
        { fallbackErrorText: '刷新 Apifox 数据失败。' },
        { onErrorText: setErrorText },
      );
      await load(settings, nextStatus);
      const successText = `Apifox 接口信息已刷新，共加载 ${nextStatus.endpointCount} 条接口。`;
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
    setConfigModalContent(JSON.stringify(createPortableSettingsConfig(settings), null, 2));
    setConfigModalMode('export');
    openConfigModal();
  }

  async function handleReset() {
    const defaults = getDefaultSettings();
    await saveSettings(defaults);
    await clearApifoxData();
    setSettings(defaults);
    setSettingsForm(createSettingsFormState(defaults));
    setSelectedTesterAioConfigId('');
    clearApifoxStatus();
    setRequests((current) => current.map(({ apifoxUrl: _apifoxUrl, apiName: _apiName, ...request }) => request));
    setToast({ type: 'success', text: '配置已重置为默认值' });
  }

  function handleImport() {
    setConfigModalContent('');
    setConfigModalMode('import');
    openConfigModal();
  }

  function handleCopyExportConfig() {
    navigator.clipboard.writeText(configModalContent).catch(() => {});
    closeConfigModal();
    setToast({ type: 'success', text: '配置已复制到剪贴板' });
  }

  async function handleConfigModalConfirm() {
    try {
      const parsed = JSON.parse(configModalContent);
      const nextForm = parsePortableSettingsConfig(parsed);
      const nextSettings = buildSettingsFromForm(nextForm);

      if (!isValidResponseErrorRuleConfig(nextSettings.responseErrorRule)) {
        throw new Error('异常响应规则格式错误，请使用 JSON 数组格式');
      }

      closeConfigModal();
      await handleSaveSettings(nextForm);
    } catch (error) {
      setToast({
        type: 'error',
        text: getErrorMessage(error, '配置格式错误，请检查 JSON'),
      });
    }
  }

  async function handleQuickMock() {
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
        onToggleSettings={toggleShowSettings}
      />

      {showSettings ? (
        <SettingsPanel
          form={settingsForm}
          savingSettings={savingSettings}
          isDefaultConfig={isDefaultConfig}
          onCancel={closeSettings}
          onFieldChange={updateSettingsForm}
          onModeChange={updateMode}
          onTesterAioConfigChange={updateTesterAioConfig}
          onMoveTesterAioConfig={moveTesterAioConfig}
          onAddTesterAioConfig={addTesterAioConfig}
          onRemoveTesterAioConfig={removeTesterAioConfig}
          onSave={() => void handleSaveSettings()}
          onReset={handleReset}
          onImport={handleImport}
          onExport={handleExport}
        />
      ) : (
        <>
          {pageMonitoringEnabled ? (
            <>
              <RequestHistoryPanel
                filteredRequests={filteredRequests}
                requests={requests}
                selectedIds={selectedIds}
                settings={settings}
                onClearRequests={() => {
                  void clearCurrentTabRequests();
                  setSelectedIds([]);
                }}
                onClearSelection={clearSelection}
                onSelectAll={selectAll}
                onToggleRequest={toggleRequest}
              />
              <RequestParamsPanel
                includeRequestParams={includeRequestParams}
                testerAioConfigs={settings.mode === 'tester' ? settings.testerAioConfigs : []}
                selectedTesterAioConfigId={selectedTesterAioConfigId}
                onToggleRequestParams={toggleIncludeRequestParams}
                onSelectedTesterAioConfigChange={setSelectedTesterAioConfigId}
              />
            </>
          ) : null}

          <NotePanel
            copying={copying}
            quickMocking={quickMocking}
            note={note}
            selectedCount={selectedRequests.length}
            mode={settings.mode}
            testerAioConfigs={settings.testerAioConfigs}
            onCopy={() => void copyFeedback()}
            onQuickMock={() => void handleQuickMock()}
            onCopyToAio={() => void handleCopyToAio()}
            quickFillOptions={quickFillOptions}
            useQuickFill={useQuickFill}
            selectedQuickFillValues={selectedQuickFillValues}
            onNoteChange={setNote}
            onToggleQuickFill={toggleUseQuickFill}
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
          onClose={closeConfigModal}
        />
      )}

      <div className="popup-version">
        <span>{versionText}</span>
        {POPUP_FOOTER_LINKS.map((link) => (
          <span key={link.href} className="popup-version-segment">
            <span className="popup-version-divider" aria-hidden="true">|</span>
            <a
              className="popup-version-link"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              title={link.title}
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>
    </main>
  );
}
