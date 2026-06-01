import {
  buildApifoxExportUrl,
  getDefaultSettings,
  getApifoxProjectId,
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
  apifoxProjectIdInput: string;
  responseErrorRuleInput: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionIdInput: string;
  testerAioConfigs: TesterAioConfig[];
}

export interface PortableSettingsConfig {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  quickFillTemplates: string[];
  apifoxProjectId: string;
  responseErrorRule: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionId: string;
  testerAioConfigs: TesterAioConfig[];
}

export function createSettingsFormState(settings: QuickCopySettings): SettingsFormState {
  return {
    feedbackTitle: settings.feedbackTitle,
    originInput: stringifyLines(settings.monitoredOrigins),
    prefixInput: stringifyLines(settings.apiPrefixes),
    customFieldsInput: stringifyLines(settings.customFields),
    quickFillTemplatesInput: stringifyLines(settings.quickFillTemplates),
    apifoxProjectIdInput: getApifoxProjectId(settings.apifoxExportUrl),
    responseErrorRuleInput: settings.responseErrorRule,
    mode: settings.mode,
    quickMockTargetExtensionIdInput: settings.quickMockTargetExtensionId,
    testerAioConfigs: settings.testerAioConfigs.map((item) => ({ ...item })),
  };
}

export function getDefaultSettingsFormState(): SettingsFormState {
  return createSettingsFormState(getDefaultSettings());
}

export function createPortableSettingsConfig(settings: QuickCopySettings): PortableSettingsConfig {
  return {
    feedbackTitle: settings.feedbackTitle,
    monitoredOrigins: [...settings.monitoredOrigins],
    apiPrefixes: [...settings.apiPrefixes],
    customFields: [...settings.customFields],
    quickFillTemplates: [...settings.quickFillTemplates],
    apifoxProjectId: getApifoxProjectId(settings.apifoxExportUrl),
    responseErrorRule: settings.responseErrorRule,
    mode: settings.mode,
    quickMockTargetExtensionId: settings.quickMockTargetExtensionId,
    testerAioConfigs: settings.testerAioConfigs.map((item) => ({ ...item })),
  };
}

export function createSettingsFormStateFromPortableConfig(
  config: PortableSettingsConfig,
): SettingsFormState {
  return {
    feedbackTitle: config.feedbackTitle,
    originInput: stringifyLines(config.monitoredOrigins),
    prefixInput: stringifyLines(config.apiPrefixes),
    customFieldsInput: stringifyLines(config.customFields),
    quickFillTemplatesInput: stringifyLines(config.quickFillTemplates),
    apifoxProjectIdInput: config.apifoxProjectId,
    responseErrorRuleInput: config.responseErrorRule,
    mode: config.mode,
    quickMockTargetExtensionIdInput: config.quickMockTargetExtensionId,
    testerAioConfigs: config.testerAioConfigs.map((item) => ({ ...item })),
  };
}

function sanitizePortableSettingsConfig(
  value: unknown,
): PortableSettingsConfig {
  const defaults = getDefaultSettings();

  if (!value || typeof value !== 'object') {
    throw new Error('配置格式错误，请检查 JSON');
  }

  const current = value as Partial<PortableSettingsConfig>;
  const mode = current.mode;

  if (mode !== 'default' && mode !== 'developer' && mode !== 'tester') {
    throw new Error('配置格式错误，mode 字段无效。');
  }

  return {
    feedbackTitle: typeof current.feedbackTitle === 'string' ? current.feedbackTitle : defaults.feedbackTitle,
    monitoredOrigins: Array.isArray(current.monitoredOrigins)
      ? current.monitoredOrigins.filter((item): item is string => typeof item === 'string')
      : defaults.monitoredOrigins,
    apiPrefixes: Array.isArray(current.apiPrefixes)
      ? current.apiPrefixes.filter((item): item is string => typeof item === 'string')
      : defaults.apiPrefixes,
    customFields: Array.isArray(current.customFields)
      ? current.customFields.filter((item): item is string => typeof item === 'string')
      : defaults.customFields,
    quickFillTemplates: Array.isArray(current.quickFillTemplates)
      ? current.quickFillTemplates.filter((item): item is string => typeof item === 'string')
      : defaults.quickFillTemplates,
    apifoxProjectId: typeof current.apifoxProjectId === 'string' ? current.apifoxProjectId.trim() : '',
    responseErrorRule: typeof current.responseErrorRule === 'string'
      ? current.responseErrorRule
      : defaults.responseErrorRule,
    mode,
    quickMockTargetExtensionId: typeof current.quickMockTargetExtensionId === 'string'
      ? current.quickMockTargetExtensionId
      : defaults.quickMockTargetExtensionId,
    testerAioConfigs: Array.isArray(current.testerAioConfigs)
      ? current.testerAioConfigs
          .filter((item): item is TesterAioConfig => Boolean(item) && typeof item === 'object')
          .map((item, index) => ({
            id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `aio-${index + 1}`,
            iterationName: typeof item.iterationName === 'string' ? item.iterationName : '',
            bugUrl: typeof item.bugUrl === 'string' ? item.bugUrl : '',
          }))
      : [],
  };
}

export function parsePortableSettingsConfig(value: unknown): SettingsFormState {
  return createSettingsFormStateFromPortableConfig(sanitizePortableSettingsConfig(value));
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

  const apifoxProjectId = form.apifoxProjectIdInput.trim();
  if (apifoxProjectId && !/^\d+$/.test(apifoxProjectId)) {
    throw new Error('Apifox 项目 ID 只能填写数字。');
  }

  return {
    feedbackTitle: form.feedbackTitle.trim() || defaults.feedbackTitle,
    monitoredOrigins: parseLines(form.originInput),
    apiPrefixes: parseLines(form.prefixInput),
    customFields: parseLines(form.customFieldsInput),
    quickFillTemplates: parseLines(form.quickFillTemplatesInput),
    apifoxExportUrl: buildApifoxExportUrl(apifoxProjectId),
    responseErrorRule: form.responseErrorRuleInput.trim() || defaults.responseErrorRule,
    mode: form.mode,
    quickMockTargetExtensionId: form.quickMockTargetExtensionIdInput.trim(),
    testerAioConfigs,
  };
}
