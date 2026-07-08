import { DEFAULT_RESPONSE_ERROR_RULE, SETTINGS_STORAGE_KEY } from './constants';
import type { EnvironmentConfig, QuickCopyMode, QuickCopySettings, TesterAioConfig } from './types';

/** 固定环境列表：LOCAL / FAT / UAT / PROD，用户只需填写对应 URL。 */
const FIXED_ENVIRONMENTS: EnvironmentConfig[] = [
  { id: 'env-local', name: 'LOCAL', url: '' },
  { id: 'env-fat', name: 'FAT', url: '' },
  { id: 'env-uat', name: 'UAT', url: '' },
  { id: 'env-prod', name: 'PROD', url: '' },
];

const DEFAULT_SETTINGS: QuickCopySettings = {
  feedbackTitle: '页面接口信息如下',
  monitoredOrigins: ['localhost', '127.0.0.1'],
  apiPrefixes: ['/api/saas/'],
  customFields: [],
  quickFillTemplates: [],
  apifoxExportUrl: '',
  apifoxAuthToken: '',
  responseErrorRule: DEFAULT_RESPONSE_ERROR_RULE,
  mode: 'default',
  quickMockTargetExtensionId: '',
  testerAioConfigs: [],
  environments: FIXED_ENVIRONMENTS.map((env) => ({ ...env })),
};

function sanitizeStringArray(
  value: unknown,
  fallback: string[],
): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function sanitizeTrimmedString(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue || fallback;
}

function isQuickCopyMode(value: unknown): value is QuickCopyMode {
  return value === 'default' || value === 'developer' || value === 'tester';
}

function sanitizeTesterAioConfigs(value: unknown): TesterAioConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const iterationName = typeof item.iterationName === 'string' ? item.iterationName.trim() : '';
    const bugUrl = typeof item.bugUrl === 'string' ? item.bugUrl.trim() : '';

    if (!iterationName || !bugUrl) {
      return [];
    }

    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `aio-${index + 1}`;

    return [{ id, iterationName, bugUrl }];
  });
}

function sanitizeEnvironments(value: unknown): EnvironmentConfig[] {
  // 从已保存数据中读取各环境的 URL，按大写名称索引
  const savedMap = new Map<string, string>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;

      const name = typeof record.name === 'string'
        ? record.name.trim().toUpperCase()
        : '';
      const url = typeof record.url === 'string'
        ? record.url.trim()
        : '';

      if (name && url) {
        savedMap.set(name, url);
      }
    }
  }

  // 以固定环境列表为基准，合并已保存的 URL
  return FIXED_ENVIRONMENTS.map((env) => ({
    ...env,
    url: savedMap.get(env.name) ?? env.url,
  }));
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function areTesterAioConfigsEqual(left: TesterAioConfig[], right: TesterAioConfig[]): boolean {
  return left.length === right.length
    && left.every(
      (value, index) => value.id === right[index]?.id
        && value.iterationName === right[index]?.iterationName
        && value.bugUrl === right[index]?.bugUrl,
    );
}

function areEnvironmentsEqual(left: EnvironmentConfig[], right: EnvironmentConfig[]): boolean {
  return left.length === right.length
    && left.every(
      (value, index) => value.id === right[index]?.id
        && value.name === right[index]?.name
        && value.url === right[index]?.url,
    );
}

export function normalizeSettings(
  current?: Partial<QuickCopySettings>,
): QuickCopySettings {
  const defaults = getDefaultSettings();
  const legacySettings = current as (Partial<QuickCopySettings> & { developerMode?: boolean }) | undefined;
  const legacyDeveloperMode = typeof legacySettings?.developerMode === 'boolean'
    ? legacySettings.developerMode
    : false;
  const normalizedMode = isQuickCopyMode(current?.mode)
    ? current.mode
    : legacyDeveloperMode
      ? 'developer'
      : defaults.mode;

  return {
    feedbackTitle: sanitizeTrimmedString(current?.feedbackTitle, defaults.feedbackTitle),
    monitoredOrigins: sanitizeStringArray(current?.monitoredOrigins, defaults.monitoredOrigins),
    apiPrefixes: sanitizeStringArray(current?.apiPrefixes, defaults.apiPrefixes),
    customFields: sanitizeStringArray(current?.customFields, defaults.customFields),
    quickFillTemplates: sanitizeStringArray(current?.quickFillTemplates, defaults.quickFillTemplates),
    apifoxExportUrl:
      typeof current?.apifoxExportUrl === 'string'
        ? current.apifoxExportUrl.trim()
        : defaults.apifoxExportUrl,
    apifoxAuthToken:
      typeof current?.apifoxAuthToken === 'string'
        ? current.apifoxAuthToken.trim()
        : defaults.apifoxAuthToken,
    responseErrorRule: sanitizeTrimmedString(current?.responseErrorRule, defaults.responseErrorRule),
    mode: normalizedMode,
    quickMockTargetExtensionId: sanitizeTrimmedString(
      current?.quickMockTargetExtensionId,
      defaults.quickMockTargetExtensionId,
    ),
    testerAioConfigs: sanitizeTesterAioConfigs(current?.testerAioConfigs),
    environments: sanitizeEnvironments(current?.environments),
  };
}

export function getDefaultSettings(): QuickCopySettings {
  return {
    ...DEFAULT_SETTINGS,
    monitoredOrigins: [...DEFAULT_SETTINGS.monitoredOrigins],
    apiPrefixes: [...DEFAULT_SETTINGS.apiPrefixes],
    customFields: [...DEFAULT_SETTINGS.customFields],
    quickFillTemplates: [...DEFAULT_SETTINGS.quickFillTemplates],
    testerAioConfigs: [...DEFAULT_SETTINGS.testerAioConfigs],
    environments: [...DEFAULT_SETTINGS.environments],
  };
}

export function isDefaultSettings(settings: QuickCopySettings): boolean {
  const defaults = getDefaultSettings();

  return (
    settings.feedbackTitle === defaults.feedbackTitle &&
    areStringArraysEqual(settings.monitoredOrigins, defaults.monitoredOrigins) &&
    areStringArraysEqual(settings.apiPrefixes, defaults.apiPrefixes) &&
    areStringArraysEqual(settings.customFields, defaults.customFields) &&
    areStringArraysEqual(settings.quickFillTemplates, defaults.quickFillTemplates) &&
    settings.apifoxExportUrl === defaults.apifoxExportUrl &&
    settings.apifoxAuthToken === defaults.apifoxAuthToken &&
    settings.responseErrorRule === defaults.responseErrorRule &&
    settings.mode === defaults.mode &&
    settings.quickMockTargetExtensionId === defaults.quickMockTargetExtensionId &&
    areTesterAioConfigsEqual(settings.testerAioConfigs, defaults.testerAioConfigs) &&
    areEnvironmentsEqual(settings.environments, defaults.environments)
  );
}

export async function loadSettings(): Promise<QuickCopySettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
  const current = stored[SETTINGS_STORAGE_KEY] as Partial<QuickCopySettings> | undefined;

  return normalizeSettings(current);
}

export async function saveSettings(settings: QuickCopySettings): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: settings,
  });
}
