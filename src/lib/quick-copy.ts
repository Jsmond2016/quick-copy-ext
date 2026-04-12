export const MAX_REQUESTS_PER_TAB = 200;
export const SETTINGS_STORAGE_KEY = 'quick-copy-settings';

export const TRACE_HEADER_KEYS = ['traceid', 'trace-id', 'x-trace-id', 'x-b3-traceid'];

export type HeaderRecord = Record<string, string>;

export interface NetworkRequestRecord {
  id: string;
  requestId: string;
  tabId: number;
  url: string;
  method: string;
  type: string;
  statusCode?: number;
  initiator?: string;
  startedAt: number;
  completedAt?: number;
  headers: HeaderRecord;
  error?: string;
}

export interface PageSummary {
  title: string;
  url: string;
}

export interface PopupPayload {
  page: PageSummary;
  requests: NetworkRequestRecord[];
}

export interface CopyPayload extends PopupPayload {
  note: string;
  screenshotLabel: string;
  customFields: string[];
}

export interface QuickCopySettings {
  apiPrefixes: string[];
  customFields: string[];
}

export type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number };

export type RuntimeResponseMessage =
  | { ok: true; data: NetworkRequestRecord[] }
  | { ok: false; error: string };

export function normalizeHeaders(
  headers: chrome.webRequest.HttpHeader[] | undefined,
): HeaderRecord {
  const result: HeaderRecord = {};

  for (const header of headers ?? []) {
    if (!header.name) {
      continue;
    }

    result[header.name.toLowerCase()] = header.value ?? '';
  }

  return result;
}

export function getTraceId(headers: HeaderRecord): string {
  for (const key of TRACE_HEADER_KEYS) {
    const value = headers[key];
    if (value) {
      return value;
    }
  }

  return 'N/A';
}

export function getDisplayPath(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

export function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt || completedAt < startedAt) {
    return '进行中';
  }

  return `${completedAt - startedAt} ms`;
}

export function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyLines(values: string[]): string {
  return values.join('\n');
}

export function getDefaultSettings(): QuickCopySettings {
  return {
    apiPrefixes: ['/api/saas/'],
    customFields: [],
  };
}

export async function loadSettings(): Promise<QuickCopySettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
  const current = stored[SETTINGS_STORAGE_KEY] as Partial<QuickCopySettings> | undefined;
  const defaults = getDefaultSettings();

  return {
    apiPrefixes: Array.isArray(current?.apiPrefixes) ? current.apiPrefixes.filter(Boolean) : defaults.apiPrefixes,
    customFields: Array.isArray(current?.customFields) ? current.customFields.filter(Boolean) : defaults.customFields,
  };
}

export async function saveSettings(settings: QuickCopySettings): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: settings,
  });
}

export function matchesApiPrefixes(url: string, prefixes: string[]): boolean {
  if (prefixes.length === 0) {
    return true;
  }

  const normalizedPrefixes = prefixes.map((item) => item.trim()).filter(Boolean);
  if (normalizedPrefixes.length === 0) {
    return true;
  }

  let pathAndSearch = url;
  try {
    const parsedUrl = new URL(url);
    pathAndSearch = `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    pathAndSearch = url;
  }

  return normalizedPrefixes.some(
    (prefix) => pathAndSearch.startsWith(prefix) || url.startsWith(prefix),
  );
}

export function buildFeedbackText(payload: CopyPayload): string {
  const sections: string[] = [
    '=== 异常接口反馈',
    '',
    'Web 信息：',
    '',
    `- 页面 URL：${payload.page.url || 'N/A'}`,
    `- 页面标题：${payload.page.title || 'N/A'}`,
    '',
    '异常接口信息：',
    '',
  ];

  if (payload.requests.length === 0) {
    sections.push('- 未选择异常接口');
  } else {
    payload.requests.forEach((request, index) => {
      sections.push(`- ${request.method.toUpperCase()} ${getDisplayPath(request.url)}`);
      sections.push(`- traceId: ${getTraceId(request.headers)}`);
      sections.push(`- 状态码: ${request.statusCode ?? 'N/A'}`);
      sections.push(`- 请求时间: ${formatTime(request.startedAt)}`);
      sections.push(`- 耗时: ${formatDuration(request.startedAt, request.completedAt)}`);

      if (index < payload.requests.length - 1) {
        sections.push('');
      }
    });
  }

  sections.push('');
  sections.push('截图信息：');
  sections.push('');
  sections.push(`- ${payload.screenshotLabel}`);
  sections.push('');
  sections.push('自定义字段：');
  sections.push('');
  if (payload.customFields.length === 0) {
    sections.push('- 无');
  } else {
    payload.customFields.forEach((field) => {
      sections.push(`- ${field}`);
    });
  }
  sections.push('');
  sections.push('其他备注说明：');
  sections.push('');
  sections.push(payload.note.trim() || '无');
  sections.push('');
  sections.push('=== From Quick Copy Ext');

  return sections.join('\n');
}
