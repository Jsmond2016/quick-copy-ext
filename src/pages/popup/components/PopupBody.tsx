import { NetworkRequestRecord, PageErrorRecord, QuickCopyMode, QuickCopySettings, RecordingSession, TesterAioConfig } from '@src/lib/quick-copy';
import { NotePanel } from '@pages/popup/components/NotePanel';
import { PageErrorPanel } from '@pages/popup/components/PageErrorPanel';
import { RequestHistoryPanel } from '@pages/popup/components/RequestHistoryPanel';
import { RequestParamsPanel } from '@pages/popup/components/RequestParamsPanel';
import { RecordingPanel } from '@pages/popup/components/RecordingPanel';
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
  recording: RecordingSession;
  recordingPending: boolean;
  recordingSupported: boolean;
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
  onPageErrorCaptureEnabledChange: (value: boolean) => void;
  onImportSettings: () => void;
  onModeChange: (mode: QuickCopyMode) => void;
  onMoveTesterAioConfig: (index: number, direction: 'up' | 'down') => void;
  onNoteChange: (value: string) => void;
  onQuickFillSelectionChange: (values: string[]) => void;
  onQuickMock: () => void;
  onOpenRecordingPreview: () => void;
  onShowRecordingHistory: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRemoveTesterAioConfig: (index: number) => void;
  onResetSettings: () => void;
  onSaveSettings: () => void;
  onSelectAll: () => void;
  onSelectedTesterAioConfigChange: (value: string) => void;
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
  recording,
  recordingPending,
  recordingSupported,
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
  onPageErrorCaptureEnabledChange,
  onImportSettings,
  onModeChange,
  onMoveTesterAioConfig,
  onNoteChange,
  onQuickFillSelectionChange,
  onQuickMock,
  onOpenRecordingPreview,
  onShowRecordingHistory,
  onPauseRecording,
  onResumeRecording,
  onStartRecording,
  onStopRecording,
  onRemoveTesterAioConfig,
  onResetSettings,
  onSaveSettings,
  onSelectAll,
  onSelectedTesterAioConfigChange,
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
        onPageErrorCaptureEnabledChange={onPageErrorCaptureEnabledChange}
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
          <RecordingPanel
            enabled={pageMonitoringEnabled}
            pending={recordingPending}
            session={recording}
            supported={recordingSupported}
            onStart={onStartRecording}
            onOpenPreview={onOpenRecordingPreview}
            onShowHistory={onShowRecordingHistory}
            onPause={onPauseRecording}
            onResume={onResumeRecording}
            onStop={onStopRecording}
          />
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
            onToggleRequestParams={onToggleRequestParams}
            onSelectedTesterAioConfigChange={onSelectedTesterAioConfigChange}
          />
        </>
      ) : (
        <RecordingPanel
          enabled={false}
          pending={recordingPending}
          session={recording}
          supported={recordingSupported}
          onStart={onStartRecording}
          onOpenPreview={onOpenRecordingPreview}
          onShowHistory={onShowRecordingHistory}
          onPause={onPauseRecording}
          onResume={onResumeRecording}
          onStop={onStopRecording}
        />
      )}

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
