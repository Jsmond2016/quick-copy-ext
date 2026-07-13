import { DEFAULT_RESPONSE_ERROR_RULE, SETTINGS_STORAGE_KEY } from './constants';
import type {
  EnvironmentConfig,
  EnvironmentGroupConfig,
  QuickCopyMode,
  QuickCopySettings,
  TesterAioConfig,
} from './types';

/** 固定环境列表：LOCAL / FAT / UAT / PROD，用户只需填写对应 URL。 */
const FIXED_ENVIRONMENTS: EnvironmentConfig[] = [
  { id: 'env-local', name: 'LOCAL', url: '' },
  { id: 'env-fat', name: 'FAT', url: '' },
  { id: 'env-uat', name: 'UAT', url: '' },
  { id: 'env-prod', name: 'PROD', url: '' },
];

function createDefaultEnvironmentGroup(index = 1): EnvironmentGroupConfig {
  const id = `environment-group-${index}`;

  return {
    id,
    name: `环境-${index}`,
    environments: FIXED_ENVIRONMENTS.map((environment) => ({
      ...environment,
      id: `${id}-${environment.name.toLowerCase()}`,
    })),
  };
}

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
  environmentGroups: [createDefaultEnvironmentGroup()],
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

function sanitizeEnvironmentItems(value: unknown, groupId: string): EnvironmentConfig[] {
  const savedUrls = new Map<string, string>();

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim().toUpperCase() : '';
      const url = typeof record.url === 'string' ? record.url.trim() : '';

      if (FIXED_ENVIRONMENTS.some((environment) => environment.name === name) && !savedUrls.has(name)) {
        savedUrls.set(name, url);
      }
    });
  }

  return FIXED_ENVIRONMENTS.map((environment) => ({
    id: `${groupId}-${environment.name.toLowerCase()}`,
    name: environment.name,
    url: savedUrls.get(environment.name) ?? '',
  }));
}

function sanitizeEnvironmentGroups(value: unknown, legacyValue: unknown): EnvironmentGroupConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    if (Array.isArray(legacyValue)) {
      const legacyGroup = createDefaultEnvironmentGroup();
      return [{
        ...legacyGroup,
        environments: sanitizeEnvironmentItems(legacyValue, legacyGroup.id),
      }];
    }

    return [createDefaultEnvironmentGroup()];
  }

  const savedIds = new Set<string>();

  const groups = value.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const fallback = createDefaultEnvironmentGroup(index + 1);
    const rawId = typeof record.id === 'string' ? record.id.trim() : '';
    const baseId = rawId || fallback.id;
    let id = baseId;
    let suffix = 2;
    while (savedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : fallback.name;
    savedIds.add(id);

    return [{
      id,
      name,
      environments: sanitizeEnvironmentItems(record.environments, id),
    }];
  });

  return groups.length > 0 ? groups : [createDefaultEnvironmentGroup()];
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

function areEnvironmentGroupsEqual(
  left: EnvironmentGroupConfig[],
  right: EnvironmentGroupConfig[],
): boolean {
  return left.length === right.length
    && left.every(
      (value, index) => value.id === right[index]?.id
        && value.name === right[index]?.name
        && areEnvironmentsEqual(value.environments, right[index]?.environments ?? []),
    );
}

export function normalizeSettings(
  current?: Partial<QuickCopySettings>,
): QuickCopySettings {
  const defaults = getDefaultSettings();
  const legacySettings = current as (
    Partial<QuickCopySettings> & { developerMode?: boolean; environments?: unknown }
  ) | undefined;
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
    environmentGroups: sanitizeEnvironmentGroups(
      current?.environmentGroups,
      legacySettings?.environments,
    ),
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
    environmentGroups: DEFAULT_SETTINGS.environmentGroups.map((group) => ({
      ...group,
      environments: group.environments.map((environment) => ({ ...environment })),
    })),
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
    areEnvironmentGroupsEqual(settings.environmentGroups, defaults.environmentGroups)
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
