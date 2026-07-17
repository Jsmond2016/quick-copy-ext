import { NetworkRequestRecord, PageErrorRecord, QuickCopyMode, QuickCopySettings, TesterAioConfig } from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { PageErrorPanel } from '@pages/popup/components/PageErrorPanel';
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
  pageErrors: PageErrorRecord[];
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
  selectedEnvironment?: { name: string; url: string } | null;
  onAddTesterAioConfig: () => void;
  onCancelSettings: () => void;
  onClearRequests: () => void;
  onClearPageErrors: () => void;
  onClearSelection: () => void;
  onCopy: () => void;
  onCopyRequest: (request: NetworkRequestRecord) => void;
  onCopyPageError: (error: PageErrorRecord) => void;
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
    groupId: string,
    environmentId: string,
    value: string,
  ) => void;
  onAddEnvironmentGroup: () => string;
  onRemoveEnvironmentGroup: (groupId: string) => void;
}

export function PopupBody({
  copying,
  currentRequests,
  includeRequestParams,
  isDefaultConfig,
  mode,
  note,
  pageErrors,
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
  selectedEnvironment,
  onAddTesterAioConfig,
  onCancelSettings,
  onClearRequests,
  onClearPageErrors,
  onClearSelection,
  onCopy,
  onCopyRequest,
  onCopyPageError,
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
  onAddEnvironmentGroup,
  onRemoveEnvironmentGroup,
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
        onAddEnvironmentGroup={onAddEnvironmentGroup}
        onRemoveEnvironmentGroup={onRemoveEnvironmentGroup}
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
          <PageErrorPanel
            errors={pageErrors}
            requests={requests}
            onClear={onClearPageErrors}
            onCopy={onCopyPageError}
          />
          <RequestHistoryPanel
            filteredRequests={currentRequests}
            requests={requests}
            selectedIds={selectedIds}
            settings={settings}
            onClearRequests={onClearRequests}
            onClearSelection={onClearSelection}
            onCopyRequest={onCopyRequest}
            onSelectAll={onSelectAll}
            onToggleRequest={onToggleRequest}
          />
          <RequestParamsPanel
            includeRequestParams={includeRequestParams}
            mode={mode}
            testerAioConfigs={mode === 'tester' ? settings.testerAioConfigs : []}
            selectedTesterAioConfigId={selectedTesterAioConfigId}
            environments={settings.environmentGroups.flatMap((group) => group.environments)}
            includeEnvironment={includeEnvironment}
            selectedEnvironment={selectedEnvironment}
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
