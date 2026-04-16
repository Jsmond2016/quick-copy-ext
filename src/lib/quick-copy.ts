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
  apifoxUrl?: string;
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
  feedbackTitle: string;
  note: string;
  screenshotLabel: string;
  customFields: string[];
}

export interface QuickCopySettings {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  apifoxExportUrl: string;
}

export type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number }
  | { type: 'quick-copy/get-apifox-status' }
  | { type: 'quick-copy/refresh-apifox-data'; exportUrl: string }
  | { type: 'quick-copy/clear-apifox-data' }
  | { type: 'quick-copy/get-apifox-matches'; requests: Pick<NetworkRequestRecord, 'url' | 'method'>[] };

export type RuntimeResponseMessage =
  | { ok: true; data: NetworkRequestRecord[] }
  | { ok: false; error: string };

export interface ApifoxCacheStatus {
  ready: boolean;
  sourceUrl: string;
  endpointCount: number;
  updatedAt?: number;
  error?: string;
}

export type ApifoxStatusResponse =
  | { ok: true; data: ApifoxCacheStatus }
  | { ok: false; error: string };

export type ApifoxRefreshResponse =
  | { ok: true; data: ApifoxCacheStatus }
  | { ok: false; error: string };

export type ApifoxMatchesResponse =
  | { ok: true; data: Record<string, string> }
  | { ok: false; error: string };

export interface ApifoxEndpoint {
  path: string;
  method: string;
  apifoxUrl: string;
}

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

export function getCompactText(value: string, head = 8, tail = 6): string {
  if (!value) {
    return 'N/A';
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function getDisplayPath(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const visibleSegments = segments.slice(-3);
    const suffix = `${url.search}${url.hash}`;

    if (segments.length === 0) {
      return `${url.pathname || '/'}${suffix}`;
    }

    const prefix = segments.length > visibleSegments.length ? '/.../' : '/';
    return `${prefix}${visibleSegments.join('/')}${suffix}`;
  } catch {
    const [path = rawUrl, suffix = ''] = rawUrl.split(/(?=[?#])/);
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return rawUrl;
    }

    const visibleSegments = segments.slice(-3).join('/');
    const prefix = segments.length > 3 ? '/.../' : '/';
    return `${prefix}${visibleSegments}${suffix}`;
  }
}

export function getUrlAfterOrigin(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname || '/'}${url.search}${url.hash}`;
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
    feedbackTitle: '异常接口反馈',
    monitoredOrigins: ['localhost', '127.0.0.1'],
    apiPrefixes: ['/api/saas/'],
    customFields: [],
    apifoxExportUrl: '',
  };
}

export async function loadSettings(): Promise<QuickCopySettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
  const current = stored[SETTINGS_STORAGE_KEY] as Partial<QuickCopySettings> | undefined;
  const defaults = getDefaultSettings();

  return {
    feedbackTitle:
      typeof current?.feedbackTitle === 'string' && current.feedbackTitle.trim()
        ? current.feedbackTitle.trim()
        : defaults.feedbackTitle,
    monitoredOrigins: Array.isArray(current?.monitoredOrigins)
      ? current.monitoredOrigins.filter(Boolean)
      : defaults.monitoredOrigins,
    apiPrefixes: Array.isArray(current?.apiPrefixes) ? current.apiPrefixes.filter(Boolean) : defaults.apiPrefixes,
    customFields: Array.isArray(current?.customFields) ? current.customFields.filter(Boolean) : defaults.customFields,
    apifoxExportUrl:
      typeof current?.apifoxExportUrl === 'string'
        ? current.apifoxExportUrl.trim()
        : defaults.apifoxExportUrl,
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

function normalizeOriginRule(rule: string): string {
  const trimmedRule = rule.trim().toLowerCase();

  if (!trimmedRule) {
    return '';
  }

  try {
    return new URL(trimmedRule).origin.toLowerCase();
  } catch {
    return trimmedRule.replace(/\/+$/, '');
  }
}

export function matchesMonitoredOrigins(rawUrl: string, originRules: string[]): boolean {
  const normalizedRules = originRules.map(normalizeOriginRule).filter(Boolean);
  if (normalizedRules.length === 0) {
    return true;
  }

  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    return false;
  }

  const currentOrigin = currentUrl.origin.toLowerCase();
  const currentHost = currentUrl.hostname.toLowerCase();
  const currentHostWithPort = currentUrl.host.toLowerCase();

  return normalizedRules.some((rule) => {
    if (rule.includes('://')) {
      return currentOrigin === rule;
    }

    return currentHost === rule || currentHostWithPort === rule;
  });
}

export function buildFeedbackText(payload: CopyPayload): string {
  const sections: string[] = [
    `=== ${payload.feedbackTitle.trim() || '异常接口反馈'}`,
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
      sections.push(`- ${request.method.toUpperCase()} ${getUrlAfterOrigin(request.url)}`);
      sections.push(`- traceId: ${getTraceId(request.headers)}`);
      sections.push(`- 状态码: ${request.statusCode ?? 'N/A'}`);
      sections.push(`- 请求时间: ${formatTime(request.startedAt)}`);
      sections.push(`- 耗时: ${formatDuration(request.startedAt, request.completedAt)}`);
      sections.push(`- apifox: ${request.apifoxUrl ?? 'N/A'}`);

      if (index < payload.requests.length - 1) {
        sections.push('');
      }
    });
  }

  sections.push('');
  // sections.push('截图信息：');
  // sections.push('');
  // sections.push(`- ${payload.screenshotLabel}`);
  // sections.push('');
  if (payload.customFields.length !== 0) {
    sections.push('---');
    sections.push('');
    payload.customFields.forEach((field) => {
      sections.push(`- ${field}`);
    });
  }

  if ((payload.note.trim()) !== "") {
    sections.push('');
    sections.push('其他备注说明：');
    sections.push('');
    sections.push(payload.note)
    // sections.push(payload.note.trim() || '无');
  }
  sections.push('');
  sections.push('=== From Quick Copy Ext');

  return sections.join('\n');
}

export function normalizeApifoxMethod(method: string): string {
  return method.trim().toLowerCase();
}

export function getUrlPath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname || '/';
  } catch {
    const [path = rawUrl] = rawUrl.split(/[?#]/);
    return path || '/';
  }
}

export function getApifoxLookupKey(path: string, method: string): string {
  return `${normalizeApifoxMethod(method)} ${path}`;
}

export function normalizeApifoxUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return '';
  }

  return trimmedUrl.replace(/-run(?=[?#]|$)/, '');
}

export function extractApifoxEndpoints(schema: unknown): ApifoxEndpoint[] {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Apifox 导出内容格式不正确。');
  }

  const paths = (schema as { paths?: Record<string, unknown> }).paths;
  if (!paths || typeof paths !== 'object') {
    throw new Error('Apifox 导出内容中未找到 paths 字段。');
  }

  const endpoints: ApifoxEndpoint[] = [];

  Object.entries(paths).forEach(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    Object.entries(pathItem).forEach(([method, operation]) => {
      if (!operation || typeof operation !== 'object') {
        return;
      }

      const rawApifoxUrl = (operation as { 'x-run-in-apifox'?: unknown })['x-run-in-apifox'];
      if (typeof rawApifoxUrl !== 'string') {
        return;
      }

      const apifoxUrl = normalizeApifoxUrl(rawApifoxUrl);
      if (!apifoxUrl) {
        return;
      }

      endpoints.push({
        path,
        method: normalizeApifoxMethod(method),
        apifoxUrl,
      });
    });
  });

  return endpoints;
}
