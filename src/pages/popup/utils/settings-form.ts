import {
  getDefaultSettings,
  parseLines,
  QuickCopySettings,
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
  };
}

export function getDefaultSettingsFormState(): SettingsFormState {
  return createSettingsFormState(getDefaultSettings());
}

export function buildSettingsFromForm(form: SettingsFormState): QuickCopySettings {
  const defaults = getDefaultSettings();

  return {
    feedbackTitle: form.feedbackTitle.trim() || defaults.feedbackTitle,
    monitoredOrigins: parseLines(form.originInput),
    apiPrefixes: parseLines(form.prefixInput),
    customFields: parseLines(form.customFieldsInput),
    quickFillTemplates: parseLines(form.quickFillTemplatesInput),
    apifoxExportUrl: form.apifoxExportUrlInput.trim(),
    responseErrorRule: form.responseErrorRuleInput.trim() || defaults.responseErrorRule,
  };
}
