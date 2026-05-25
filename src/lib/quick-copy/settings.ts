import { DEFAULT_RESPONSE_ERROR_RULE, SETTINGS_STORAGE_KEY } from './constants';
import type { QuickCopySettings } from './types';

const DEFAULT_SETTINGS: QuickCopySettings = {
  feedbackTitle: '页面接口信息如下',
  monitoredOrigins: ['localhost', '127.0.0.1'],
  apiPrefixes: ['/api/saas/'],
  customFields: [],
  quickFillTemplates: [],
  apifoxExportUrl: '',
  responseErrorRule: DEFAULT_RESPONSE_ERROR_RULE,
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

function areStringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function getDefaultSettings(): QuickCopySettings {
  return {
    ...DEFAULT_SETTINGS,
    monitoredOrigins: [...DEFAULT_SETTINGS.monitoredOrigins],
    apiPrefixes: [...DEFAULT_SETTINGS.apiPrefixes],
    customFields: [...DEFAULT_SETTINGS.customFields],
    quickFillTemplates: [...DEFAULT_SETTINGS.quickFillTemplates],
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
    settings.responseErrorRule === defaults.responseErrorRule
  );
}

export async function loadSettings(): Promise<QuickCopySettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
  const current = stored[SETTINGS_STORAGE_KEY] as Partial<QuickCopySettings> | undefined;
  const defaults = getDefaultSettings();

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
    responseErrorRule: sanitizeTrimmedString(current?.responseErrorRule, defaults.responseErrorRule),
  };
}

export async function saveSettings(settings: QuickCopySettings): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: settings,
  });
}
