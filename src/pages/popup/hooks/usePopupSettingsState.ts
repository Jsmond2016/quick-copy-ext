import { useState } from 'react';
import { useBoolean } from 'ahooks';
import {
  EnvironmentGroupConfig,
  getDefaultSettings,
  QuickCopyMode,
  QuickCopySettings,
  TesterAioConfig,
} from '@src/lib/quick-copy';
import {
  getDefaultSettingsFormState,
  SettingsFormState,
} from '@pages/popup/utils/settings-form';

type ConfigModalMode = 'import' | 'export';

interface UsePopupSettingsStateResult {
  closeConfigModal: () => void;
  closeSettings: () => void;
  configModalContent: string;
  configModalMode: ConfigModalMode;
  openConfigModal: () => void;
  openSettings: () => void;
  selectedTesterAioConfigId: string;
  setConfigModalContent: (value: string) => void;
  setConfigModalMode: (mode: ConfigModalMode) => void;
  setSelectedTesterAioConfigId: (value: string) => void;
  setSettings: (value: QuickCopySettings) => void;
  setSettingsForm: (value: SettingsFormState) => void;
  settings: QuickCopySettings;
  settingsForm: SettingsFormState;
  showConfigModal: boolean;
  showSettings: boolean;
  toggleShowSettings: () => void;
  updateMode: (mode: QuickCopyMode) => void;
  updateSettingsForm: (field: keyof SettingsFormState, value: string) => void;
  updateTesterAioConfig: (
    index: number,
    field: 'iterationName' | 'bugUrl',
    value: string,
  ) => void;
  addTesterAioConfig: () => void;
  removeTesterAioConfig: (index: number) => void;
  moveTesterAioConfig: (index: number, direction: 'up' | 'down') => void;
  updateEnvironment: (
    groupId: string,
    environmentId: string,
    value: string,
  ) => void;
  addEnvironmentGroup: () => string;
  removeEnvironmentGroup: (groupId: string) => void;
}

function createEmptyTesterAioConfig(): TesterAioConfig {
  return {
    id: crypto.randomUUID?.() ?? `aio-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    iterationName: '',
    bugUrl: '',
  };
}

function createEnvironmentGroup(index: number): EnvironmentGroupConfig {
  const id = crypto.randomUUID?.() ?? `environment-group-${Date.now()}-${index}`;

  return {
    id,
    name: `环境-${index}`,
    environments: ['LOCAL', 'FAT', 'UAT', 'PROD'].map((name) => ({
      id: `${id}-${name.toLowerCase()}`,
      name,
      url: '',
    })),
  };
}

export function usePopupSettingsState(): UsePopupSettingsStateResult {
  const [showSettings, { toggle: toggleShowSettings, setTrue: openSettings, setFalse: closeSettings }] = useBoolean(false);
  const [settings, setSettings] = useState<QuickCopySettings>(getDefaultSettings());
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(getDefaultSettingsFormState());
  const [selectedTesterAioConfigId, setSelectedTesterAioConfigId] = useState('');
  const [showConfigModal, { setTrue: openConfigModal, setFalse: closeConfigModal }] = useBoolean(false);
  const [configModalContent, setConfigModalContent] = useState('');
  const [configModalMode, setConfigModalMode] = useState<ConfigModalMode>('export');

  function updateSettingsForm(field: keyof SettingsFormState, value: string): void {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMode(mode: QuickCopyMode): void {
    setSettingsForm((current) => ({
      ...current,
      mode,
      testerAioConfigs:
        mode === 'tester' && current.testerAioConfigs.length === 0
          ? [createEmptyTesterAioConfig()]
          : current.testerAioConfigs,
    }));
  }

  function updateTesterAioConfig(
    index: number,
    field: 'iterationName' | 'bugUrl',
    value: string,
  ): void {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: current.testerAioConfigs.map((item, currentIndex) => (
        currentIndex === index
          ? { ...item, [field]: value }
          : item
      )),
    }));
  }

  function addTesterAioConfig(): void {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: [...current.testerAioConfigs, createEmptyTesterAioConfig()],
    }));
  }

  function removeTesterAioConfig(index: number): void {
    setSettingsForm((current) => ({
      ...current,
      testerAioConfigs: current.testerAioConfigs.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function moveTesterAioConfig(index: number, direction: 'up' | 'down'): void {
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

  function updateEnvironment(
    groupId: string,
    environmentId: string,
    value: string,
  ): void {
    setSettingsForm((current) => ({
      ...current,
      environmentGroups: current.environmentGroups.map((group) => (
        group.id === groupId
          ? {
              ...group,
              environments: group.environments.map((environment) => (
                environment.id === environmentId
                  ? { ...environment, url: value }
                  : environment
              )),
            }
          : group
      )),
    }));
  }

  function addEnvironmentGroup(): string {
    const nextIndex = settingsForm.environmentGroups.reduce((maxIndex, group) => {
      const matchedIndex = Number(group.name.match(/(\d+)$/)?.[1] ?? 0);
      return Math.max(maxIndex, matchedIndex);
    }, 0) + 1;
    const nextGroup = createEnvironmentGroup(nextIndex);

    setSettingsForm((current) => ({
      ...current,
      environmentGroups: [...current.environmentGroups, nextGroup],
    }));
    return nextGroup.id;
  }

  function removeEnvironmentGroup(groupId: string): void {
    setSettingsForm((current) => {
      if (current.environmentGroups.length === 1) return current;

      return {
        ...current,
        environmentGroups: current.environmentGroups.filter((group) => group.id !== groupId),
      };
    });
  }

  return {
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
  };
}
