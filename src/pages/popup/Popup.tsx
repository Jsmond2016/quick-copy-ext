import { useMemo, useState } from 'react';
import { useBoolean, useMount, useRequest, useUpdateEffect } from 'ahooks';
import pkg from '../../../package.json';
import {
  detectEnvironmentFromRequests,
  getDefaultSettings,
  isDefaultSettings,
  isLocalhostUrl,
  isValidResponseErrorRuleConfig,
  loadSettings,
  matchCurrentEnvironment,
  matchesMonitoredOrigins,
  matchesApiPrefixes,
  QuickCopyMode,
  QuickCopySettings,
  saveSettings,
} from '@src/lib/quick-copy';
import { ConfigModal } from '@pages/popup/components/ConfigModal';
import { PopupBody } from '@pages/popup/components/PopupBody';
import { PopupFooter } from '@pages/popup/components/PopupFooter';
import { PopupHero } from '@pages/popup/components/PopupHero';
import { ToastMessage } from '@pages/popup/components/ToastMessage';
import { DEFAULT_APIFOX_STATUS } from '@pages/popup/constants';
import { useApifox } from '@pages/popup/hooks/useApifox';
import { usePopupFeedbackActions } from '@pages/popup/hooks/usePopupFeedbackActions';
import { usePageErrors } from '@pages/popup/hooks/usePageErrors';
import { usePopupSettingsState } from '@pages/popup/hooks/usePopupSettingsState';
import { useTabRequests } from '@pages/popup/hooks/useTabRequests';
import { useSelection } from '@pages/popup/hooks/useSelection';
import { useToast } from '@pages/popup/hooks/useToast';
import { clearApifoxData, getErrorMessage, getApifoxStatus } from '@pages/popup/services/runtime';
import { getSettingsSavedMessage, hasApifoxConfigChanged } from '@pages/popup/utils/apifox-settings';
import {
  buildSettingsFromForm,
  createPortableSettingsConfig,
  createSettingsFormState,
  parsePortableSettingsConfig,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

export default function Popup() {
  const versionText = `当前版本：v${pkg.version}${pkg.releaseDate ? `_${pkg.releaseDate}` : ''}`;
  const [note, setNote] = useState('');
  const [savingSettings, { setTrue: startSavingSettings, setFalse: stopSavingSettings }] = useBoolean(false);
  const [includeRequestParams, { toggle: toggleIncludeRequestParams }] = useBoolean(true);
  const [includeEnvironment, { toggle: toggleIncludeEnvironment }] = useBoolean(true);
  const [useQuickFill, { toggle: toggleUseQuickFill, setFalse: disableQuickFill, set: setUseQuickFill }] = useBoolean(false);
  const [selectedQuickFillValues, setSelectedQuickFillValues] = useState<string[]>([]);
  const {
    addEnvironmentGroup,
    addTesterAioConfig,
    closeConfigModal,
    closeSettings,
    configModalContent,
    configModalMode,
    moveTesterAioConfig,
    openConfigModal,
    openSettings,
    removeTesterAioConfig,
    removeEnvironmentGroup,
    selectedTesterAioConfigId,
    setConfigModalContent,
    setConfigModalMode,
    setSelectedTesterAioConfigId,
    setSettings,
    setSettingsForm,
    settings,
    settingsForm,
    showConfigModal,
    showSettings,
    toggleShowSettings,
    updateMode,
    updateSettingsForm,
    updateTesterAioConfig,
    updateEnvironment,
  } = usePopupSettingsState();
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
  const { pageErrors, clear: clearPageErrors, copy: copyPageError } = usePageErrors(tabId, page, requests, setToast);
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
  const environmentConfigs = useMemo(
    () => settings.environmentGroups.flatMap((group) => group.environments),
    [settings.environmentGroups],
  );
  const selectedTesterAioConfig = useMemo(
    () => settings.testerAioConfigs.find((item) => item.id === selectedTesterAioConfigId) ?? null,
    [selectedTesterAioConfigId, settings.testerAioConfigs],
  );

  const detectedEnvironment = useMemo(
    () => {
      // 非本地页面优先使用页面自身域名，避免请求标记覆盖精确匹配结果。
      const matchedByUrl = matchCurrentEnvironment(page.url, environmentConfigs);
      if (matchedByUrl && !isLocalhostUrl(page.url)) return matchedByUrl;

      // localhost 下优先从请求域名或 x-forwarded-for 响应头检测环境。
      const detected = detectEnvironmentFromRequests(requests, environmentConfigs);
      if (detected) return detected;

      if (matchedByUrl) return matchedByUrl;

      return null;
    },
    [environmentConfigs, page.url, requests],
  );
  const selectedEnvironment = includeEnvironment ? detectedEnvironment : null;
  const selectedEnvironmentGroup = useMemo(
    () => settings.environmentGroups.find((group) => (
      group.environments.some((environment) => environment.id === detectedEnvironment?.id)
    )) ?? settings.environmentGroups[0],
    [detectedEnvironment?.id, settings.environmentGroups],
  );

  const {
    selectedIds,
    selectedRequests,
    toggleRequest,
    selectAll,
    clearSelection,
    setSelectedIds,
  } = useSelection(filteredRequests);
  const {
    copying,
    copyFeedback,
    copyRequest,
    handleCopyToAio,
    handleQuickMock,
    handleRefreshApifox,
    quickMocking,
  } = usePopupFeedbackActions({
    apifoxStatus,
    attachApifoxUrls,
    includeRequestParams,
    load,
    note,
    page,
    refreshApifox,
    requests,
    selectedIds,
    selectedRequests,
    selectedTesterAioConfig,
    selectedEnvironment,
    setApifoxStatus,
    setErrorText,
    setRequests,
    setToast,
    settings,
    tabId,
  });

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

  function updateNoteWithQuickFill(values: string[]) {
    setSelectedQuickFillValues(values);
    setNote(values.join('\n\n'));
  }

  async function handleSaveSettings(overrideForm?: SettingsFormState) {
    startSavingSettings();
    setErrorText('');

    try {
      const nextSettings = buildSettingsFromForm(overrideForm ?? settingsForm);
      const apifoxConfigChanged = hasApifoxConfigChanged(settings, nextSettings);

      if (!isValidResponseErrorRuleConfig(nextSettings.responseErrorRule)) {
        throw new Error('异常响应规则格式错误，请检查 JSON 数组和表达式写法。');
      }

      if (apifoxConfigChanged) {
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
      }

      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setSettingsForm(createSettingsFormState(nextSettings));
      setSelectedTesterAioConfigId(nextSettings.testerAioConfigs[0]?.id ?? '');
      setToast({
        type: 'info',
        text: getSettingsSavedMessage(nextSettings.apifoxExportUrl, apifoxConfigChanged),
      });
      closeSettings();
      await load(nextSettings, apifoxConfigChanged ? DEFAULT_APIFOX_STATUS : apifoxStatus);

      if (apifoxConfigChanged && nextSettings.apifoxExportUrl) {
        void refreshApifox(
          nextSettings.apifoxExportUrl,
          nextSettings.apifoxAuthToken,
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

  return (
    <main className="popup-shell">
      <ToastMessage toast={toast} />

      <PopupHero
        apifoxExportUrl={settings.apifoxExportUrl}
        apifoxStatus={apifoxStatus}
        mode={settings.mode}
        page={page}
        pageMonitoringEnabled={pageMonitoringEnabled}
        refreshingApifox={refreshingApifox}
        showSettings={showSettings}
        environments={selectedEnvironmentGroup?.environments ?? []}
        onRefreshApifox={() => {
          if (!settings.apifoxExportUrl) {
            openSettings();
          }
          void handleRefreshApifox();
        }}
        onToggleSettings={toggleShowSettings}
      />

      <PopupBody
        copying={copying}
        currentRequests={filteredRequests}
        includeRequestParams={includeRequestParams}
        isDefaultConfig={isDefaultConfig}
        mode={settings.mode}
        note={note}
        pageErrors={pageErrors}
        pageMonitoringEnabled={pageMonitoringEnabled}
        quickFillOptions={quickFillOptions}
        quickMocking={quickMocking}
        requests={requests}
        savingSettings={savingSettings}
        selectedIds={selectedIds}
        selectedQuickFillValues={selectedQuickFillValues}
        selectedTesterAioConfigId={selectedTesterAioConfigId}
        selectedTesterConfigs={settings.testerAioConfigs}
        selectedRequestsCount={selectedRequests.length}
        settings={settings}
        settingsForm={settingsForm}
        showSettings={showSettings}
        useQuickFill={useQuickFill}
        includeEnvironment={includeEnvironment}
        selectedEnvironment={selectedEnvironment}
        onAddTesterAioConfig={addTesterAioConfig}
        onAddEnvironmentGroup={addEnvironmentGroup}
        onCancelSettings={closeSettings}
        onClearRequests={() => {
          void clearCurrentTabRequests();
          setSelectedIds([]);
        }}
        onClearPageErrors={() => void clearPageErrors()}
        onClearSelection={clearSelection}
        onCopy={() => void copyFeedback()}
        onCopyRequest={(request) => void copyRequest(request)}
        onCopyPageError={(error) => void copyPageError(error)}
        onCopyToAio={() => void handleCopyToAio()}
        onExportSettings={handleExport}
        onFieldChange={updateSettingsForm}
        onImportSettings={handleImport}
        onModeChange={updateMode}
        onMoveTesterAioConfig={moveTesterAioConfig}
        onNoteChange={setNote}
        onQuickFillSelectionChange={updateNoteWithQuickFill}
        onQuickMock={() => void handleQuickMock()}
        onRemoveTesterAioConfig={removeTesterAioConfig}
        onRemoveEnvironmentGroup={removeEnvironmentGroup}
        onResetSettings={() => void handleReset()}
        onSaveSettings={() => void handleSaveSettings()}
        onSelectAll={selectAll}
        onSelectedTesterAioConfigChange={setSelectedTesterAioConfigId}
        onToggleEnvironment={toggleIncludeEnvironment}
        onToggleQuickFill={toggleUseQuickFill}
        onToggleRequest={toggleRequest}
        onToggleRequestParams={toggleIncludeRequestParams}
        onTesterAioConfigChange={updateTesterAioConfig}
        onEnvironmentChange={updateEnvironment}
      />

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

      <PopupFooter versionText={versionText} />
    </main>
  );
}
