import { EnvironmentConfig, NetworkRequestRecord, QuickCopyMode, QuickCopySettings, TesterAioConfig } from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { RequestHistoryPanel } from '@pages/popup/components/RequestHistoryPanel';
import { RequestParamsPanel } from '@pages/popup/components/RequestParamsPanel';
import { SettingsPanel } from '@pages/popup/components/SettingsPanel';
import { SettingsFormState } from '@pages/popup/utils/settings-form';

interface PopupBodyProps {
  copying: boolean;
  currentRequests: NetworkRequestRecord[];
  includeRequestParams: boolean;
  isDefaultConfig: boolean;
  mode: QuickCopyMode;
  note: string;
  pageMonitoringEnabled: boolean;
  quickFillOptions: string[];
  quickMocking: boolean;
  requests: NetworkRequestRecord[];
  savingSettings: boolean;
  selectedIds: string[];
  selectedQuickFillValues: string[];
  selectedTesterAioConfigId: string;
  selectedTesterConfigs: TesterAioConfig[];
  selectedRequestsCount: number;
  settings: QuickCopySettings;
  settingsForm: SettingsFormState;
  showSettings: boolean;
  useQuickFill: boolean;
  includeEnvironment: boolean;
  onAddTesterAioConfig: () => void;
  onCancelSettings: () => void;
  onClearRequests: () => void;
  onClearSelection: () => void;
  onCopy: () => void;
  onCopyToAio: () => void;
  onExportSettings: () => void;
  onFieldChange: (field: keyof SettingsFormState, value: string) => void;
  onImportSettings: () => void;
  onModeChange: (mode: QuickCopyMode) => void;
  onMoveTesterAioConfig: (index: number, direction: 'up' | 'down') => void;
  onNoteChange: (value: string) => void;
  onQuickFillSelectionChange: (values: string[]) => void;
  onQuickMock: () => void;
  onRemoveTesterAioConfig: (index: number) => void;
  onResetSettings: () => void;
  onSaveSettings: () => void;
  onSelectAll: () => void;
  onSelectedTesterAioConfigChange: (value: string) => void;
  onToggleEnvironment: () => void;
  onToggleQuickFill: () => void;
  onToggleRequest: (requestId: string, index: number, shiftKey: boolean) => void;
  onToggleRequestParams: () => void;
  onTesterAioConfigChange: (
    index: number,
    field: 'iterationName' | 'bugUrl',
    value: string,
  ) => void;
  onEnvironmentChange: (
    index: number,
    field: 'name' | 'url',
    value: string,
  ) => void;
  onMoveEnvironment: (index: number, direction: 'up' | 'down') => void;
  onAddEnvironment: () => void;
  onRemoveEnvironment: (index: number) => void;
}

export function PopupBody({
  copying,
  currentRequests,
  includeRequestParams,
  isDefaultConfig,
  mode,
  note,
  pageMonitoringEnabled,
  quickFillOptions,
  quickMocking,
  requests,
  savingSettings,
  selectedIds,
  selectedQuickFillValues,
  selectedTesterAioConfigId,
  selectedTesterConfigs,
  selectedRequestsCount,
  settings,
  settingsForm,
  showSettings,
  useQuickFill,
  includeEnvironment,
  onAddTesterAioConfig,
  onCancelSettings,
  onClearRequests,
  onClearSelection,
  onCopy,
  onCopyToAio,
  onExportSettings,
  onFieldChange,
  onImportSettings,
  onModeChange,
  onMoveTesterAioConfig,
  onNoteChange,
  onQuickFillSelectionChange,
  onQuickMock,
  onRemoveTesterAioConfig,
  onResetSettings,
  onSaveSettings,
  onSelectAll,
  onSelectedTesterAioConfigChange,
  onToggleEnvironment,
  onToggleQuickFill,
  onToggleRequest,
  onToggleRequestParams,
  onTesterAioConfigChange,
  onEnvironmentChange,
  onMoveEnvironment,
  onAddEnvironment,
  onRemoveEnvironment,
}: PopupBodyProps) {
  if (showSettings) {
    return (
      <SettingsPanel
        form={settingsForm}
        savingSettings={savingSettings}
        isDefaultConfig={isDefaultConfig}
        onCancel={onCancelSettings}
        onFieldChange={onFieldChange}
        onModeChange={onModeChange}
        onTesterAioConfigChange={onTesterAioConfigChange}
        onMoveTesterAioConfig={onMoveTesterAioConfig}
        onAddTesterAioConfig={onAddTesterAioConfig}
        onRemoveTesterAioConfig={onRemoveTesterAioConfig}
        onEnvironmentChange={onEnvironmentChange}
        onMoveEnvironment={onMoveEnvironment}
        onAddEnvironment={onAddEnvironment}
        onRemoveEnvironment={onRemoveEnvironment}
        onSave={onSaveSettings}
        onReset={onResetSettings}
        onImport={onImportSettings}
        onExport={onExportSettings}
      />
    );
  }

  return (
    <>
      {pageMonitoringEnabled ? (
        <>
          <RequestHistoryPanel
            filteredRequests={currentRequests}
            requests={requests}
            selectedIds={selectedIds}
            settings={settings}
            onClearRequests={onClearRequests}
            onClearSelection={onClearSelection}
            onSelectAll={onSelectAll}
            onToggleRequest={onToggleRequest}
          />
          <RequestParamsPanel
            includeRequestParams={includeRequestParams}
            testerAioConfigs={mode === 'tester' ? settings.testerAioConfigs : []}
            selectedTesterAioConfigId={selectedTesterAioConfigId}
            environments={settings.environments}
            includeEnvironment={includeEnvironment}
            onToggleRequestParams={onToggleRequestParams}
            onSelectedTesterAioConfigChange={onSelectedTesterAioConfigChange}
            onToggleEnvironment={onToggleEnvironment}
          />
        </>
      ) : null}

      <NotePanel
        copying={copying}
        quickMocking={quickMocking}
        note={note}
        selectedCount={selectedRequestsCount}
        mode={mode}
        testerAioConfigs={selectedTesterConfigs}
        onCopy={onCopy}
        onQuickMock={onQuickMock}
        onCopyToAio={onCopyToAio}
        quickFillOptions={quickFillOptions}
        useQuickFill={useQuickFill}
        selectedQuickFillValues={selectedQuickFillValues}
        onNoteChange={onNoteChange}
        onToggleQuickFill={onToggleQuickFill}
        onQuickFillSelectionChange={onQuickFillSelectionChange}
      />
    </>
  );
}
