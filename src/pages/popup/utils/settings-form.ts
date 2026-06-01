import {
  getDefaultSettings,
  parseLines,
  QuickCopyMode,
  QuickCopySettings,
  TesterAioConfig,
  stringifyLines,
} from '@src/lib/quick-copy';

export interface SettingsFormState {
  feedbackTitle: string;
  originInput: string;
  prefixInput: string;
  customFieldsInput: string;
  quickFillTemplatesInput: string;
  apifoxExportUrlInput: string;
  responseErrorRuleInput: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionIdInput: string;
  testerAioConfigs: TesterAioConfig[];
}

export function createSettingsFormState(settings: QuickCopySettings): SettingsFormState {
  return {
    feedbackTitle: settings.feedbackTitle,
    originInput: stringifyLines(settings.monitoredOrigins),
    prefixInput: stringifyLines(settings.apiPrefixes),
    customFieldsInput: stringifyLines(settings.customFields),
    quickFillTemplatesInput: stringifyLines(settings.quickFillTemplates),
    apifoxExportUrlInput: settings.apifoxExportUrl,
    responseErrorRuleInput: settings.responseErrorRule,
    mode: settings.mode,
    quickMockTargetExtensionIdInput: settings.quickMockTargetExtensionId,
    testerAioConfigs: settings.testerAioConfigs.map((item) => ({ ...item })),
  };
}

export function getDefaultSettingsFormState(): SettingsFormState {
  return createSettingsFormState(getDefaultSettings());
}

export function buildSettingsFromForm(form: SettingsFormState): QuickCopySettings {
  const defaults = getDefaultSettings();
  const testerAioConfigs = form.testerAioConfigs
    .map((item) => ({
      id: item.id,
      iterationName: item.iterationName.trim(),
      bugUrl: item.bugUrl.trim(),
    }))
    .filter((item) => item.iterationName || item.bugUrl);

  if (testerAioConfigs.some((item) => !item.iterationName || !item.bugUrl)) {
    throw new Error('测试者模式下，请完整填写迭代名称和 AIO 链接。');
  }

  if (form.mode === 'tester' && testerAioConfigs.length === 0) {
    throw new Error('测试者模式下，至少需要配置一组迭代名称和 AIO 链接。');
  }

  testerAioConfigs.forEach((item) => {
    try {
      const url = new URL(item.bugUrl);

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new Error(`测试者模式下，${item.iterationName} 的 AIO 链接格式不正确。`);
    }
  });

  return {
    feedbackTitle: form.feedbackTitle.trim() || defaults.feedbackTitle,
    monitoredOrigins: parseLines(form.originInput),
    apiPrefixes: parseLines(form.prefixInput),
    customFields: parseLines(form.customFieldsInput),
    quickFillTemplates: parseLines(form.quickFillTemplatesInput),
    apifoxExportUrl: form.apifoxExportUrlInput.trim(),
    responseErrorRule: form.responseErrorRuleInput.trim() || defaults.responseErrorRule,
    mode: form.mode,
    quickMockTargetExtensionId: form.quickMockTargetExtensionIdInput.trim(),
    testerAioConfigs,
  };
}
