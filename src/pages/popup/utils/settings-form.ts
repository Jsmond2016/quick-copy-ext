import {
  buildApifoxExportUrl,
  EnvironmentGroupConfig,
  getDefaultSettings,
  getApifoxProjectId,
  isValidEnvironmentUrl,
  parseLines,
  normalizeSettings,
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
  apifoxAuthTokenInput: string;
  responseErrorRuleInput: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionIdInput: string;
  testerAioConfigs: TesterAioConfig[];
  environmentGroups: EnvironmentGroupConfig[];
}

export interface PortableSettingsConfig {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  quickFillTemplates: string[];
  apifoxProjectId: string;
  apifoxAuthToken: string;
  responseErrorRule: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionId: string;
  testerAioConfigs: TesterAioConfig[];
  environmentGroups: EnvironmentGroupConfig[];
}

function cloneEnvironmentGroups(groups: EnvironmentGroupConfig[]): EnvironmentGroupConfig[] {
  return groups.map((group) => ({
    ...group,
    environments: group.environments.map((environment) => ({ ...environment })),
  }));
}

function normalizeEnvironmentOrigin(rawUrl: string): string {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  return new URL(url).origin.toLowerCase();
}

export function createSettingsFormState(settings: QuickCopySettings): SettingsFormState {
  return {
    feedbackTitle: settings.feedbackTitle,
    originInput: stringifyLines(settings.monitoredOrigins),
    prefixInput: stringifyLines(settings.apiPrefixes),
    customFieldsInput: stringifyLines(settings.customFields),
    quickFillTemplatesInput: stringifyLines(settings.quickFillTemplates),
    apifoxProjectIdInput: getApifoxProjectId(settings.apifoxExportUrl),
    apifoxAuthTokenInput: settings.apifoxAuthToken,
    responseErrorRuleInput: settings.responseErrorRule,
    mode: settings.mode,
    quickMockTargetExtensionIdInput: settings.quickMockTargetExtensionId,
    testerAioConfigs: settings.testerAioConfigs.map((item) => ({ ...item })),
    environmentGroups: cloneEnvironmentGroups(settings.environmentGroups),
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
    apifoxAuthToken: settings.apifoxAuthToken,
    responseErrorRule: settings.responseErrorRule,
    mode: settings.mode,
    quickMockTargetExtensionId: settings.quickMockTargetExtensionId,
    testerAioConfigs: settings.testerAioConfigs.map((item) => ({ ...item })),
    environmentGroups: cloneEnvironmentGroups(settings.environmentGroups),
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
    apifoxAuthTokenInput: config.apifoxAuthToken,
    responseErrorRuleInput: config.responseErrorRule,
    mode: config.mode,
    quickMockTargetExtensionIdInput: config.quickMockTargetExtensionId,
    testerAioConfigs: config.testerAioConfigs.map((item) => ({ ...item })),
    environmentGroups: cloneEnvironmentGroups(config.environmentGroups),
  };
}

function sanitizePortableSettingsConfig(
  value: unknown,
): PortableSettingsConfig {
  const defaults = getDefaultSettings();

  if (!value || typeof value !== 'object') {
    throw new Error('配置格式错误，请检查 JSON');
  }

  const current = value as Partial<PortableSettingsConfig> & { environments?: unknown };
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
    apifoxAuthToken: typeof current.apifoxAuthToken === 'string' ? current.apifoxAuthToken.trim() : '',
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
    environmentGroups: normalizeSettings({
      environmentGroups: current.environmentGroups,
      ...(!current.environmentGroups && current.environments
        ? { environments: current.environments }
        : {}),
    } as Partial<QuickCopySettings>).environmentGroups,
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

  const environmentGroups = cloneEnvironmentGroups(form.environmentGroups).map((group) => ({
    ...group,
    name: group.name.trim(),
    environments: group.environments.map((environment) => ({
      ...environment,
      name: environment.name.trim().toUpperCase(),
      url: environment.url.trim(),
    })),
  }));
  const configuredDomains = new Map<string, string>();

  for (const group of environmentGroups) {
    for (const environment of group.environments) {
      if (environment.url && !isValidEnvironmentUrl(environment.url)) {
        throw new Error(`${group.name} 的「${environment.name}」域名格式不正确。`);
      }

      if (environment.url) {
        const normalizedDomain = normalizeEnvironmentOrigin(environment.url);
        const existingGroup = configuredDomains.get(normalizedDomain);
        if (existingGroup) {
          throw new Error(`域名「${environment.url}」已在${existingGroup}中配置。`);
        }
        configuredDomains.set(normalizedDomain, group.name);
      }
    }
  }

  return {
    feedbackTitle: form.feedbackTitle.trim() || defaults.feedbackTitle,
    monitoredOrigins: parseLines(form.originInput),
    apiPrefixes: parseLines(form.prefixInput),
    customFields: parseLines(form.customFieldsInput),
    quickFillTemplates: parseLines(form.quickFillTemplatesInput),
    apifoxExportUrl: buildApifoxExportUrl(apifoxProjectId),
    apifoxAuthToken: form.apifoxAuthTokenInput.trim(),
    responseErrorRule: form.responseErrorRuleInput.trim() || defaults.responseErrorRule,
    mode: form.mode,
    quickMockTargetExtensionId: form.quickMockTargetExtensionIdInput.trim(),
    testerAioConfigs,
    environmentGroups,
  };
}
