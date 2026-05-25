export const MAX_REQUESTS_PER_TAB = 200;
export const SETTINGS_STORAGE_KEY = 'quick-copy-settings';
export const DEFAULT_RESPONSE_ERROR_RULE = 'res.rtn !== 0';

export const TRACE_HEADER_KEYS = ['traceid', 'trace-id', 'x-trace-id', 'x-b3-traceid'];

export type HeaderRecord = Record<string, string>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface CapturedResponsePayload {
  url: string;
  method: string;
  startedAt: number;
  completedAt: number;
  statusCode?: number;
  response?: JsonValue;
  requestParams?: JsonValue;
}

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
  apiName?: string;
  responseSnapshot?: JsonValue;
  responseRuleMatched?: boolean;
  responseMessage?: string;
  abnormalReasons?: string[];
  requestParams?: Record<string, unknown>;
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
  includeRequestParams: boolean;
}

export interface QuickCopySettings {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  quickFillTemplates: string[];
  apifoxExportUrl: string;
  responseErrorRule: string;
}

export type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number }
  | { type: 'quick-copy/get-apifox-status' }
  | { type: 'quick-copy/refresh-apifox-data'; exportUrl: string }
  | { type: 'quick-copy/clear-apifox-data' }
  | { type: 'quick-copy/get-apifox-matches'; requests: Pick<NetworkRequestRecord, 'url' | 'method'>[] }
  | { type: 'quick-copy/report-response-body'; payload: CapturedResponsePayload };

export type RuntimeEventMessage = {
  type: 'quick-copy/tab-requests-updated';
  tabId: number;
};

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

export interface ApifoxMatchResult {
  apifoxUrl: string;
  apiName?: string;
}

export type ApifoxMatchesResponse =
  | { ok: true; data: Record<string, ApifoxMatchResult> }
  | { ok: false; error: string };

export interface ApifoxLookupMaps {
  endpointMap: Map<string, string>;
  pathMap: Map<string, string>;
  endpointNameMap: Map<string, string>;
  endpointCount: number;
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

export function parseParagraphBlocks(value: string): string[] {
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyParagraphBlocks(values: string[]): string {
  return values.join('\n\n');
}

export function getDefaultSettings(): QuickCopySettings {
  return {
    feedbackTitle: '页面接口信息如下',
    monitoredOrigins: ['localhost', '127.0.0.1'],
    apiPrefixes: ['/api/saas/'],
    customFields: [],
    quickFillTemplates: [],
    apifoxExportUrl: '',
    responseErrorRule: DEFAULT_RESPONSE_ERROR_RULE,
  };
}

export function isDefaultSettings(settings: QuickCopySettings): boolean {
  const defaults = getDefaultSettings();
  return (
    settings.feedbackTitle === defaults.feedbackTitle &&
    settings.monitoredOrigins.length === defaults.monitoredOrigins.length &&
    settings.monitoredOrigins.every((v, i) => v === defaults.monitoredOrigins[i]) &&
    settings.apiPrefixes.length === defaults.apiPrefixes.length &&
    settings.apiPrefixes.every((v, i) => v === defaults.apiPrefixes[i]) &&
    settings.customFields.length === defaults.customFields.length &&
    settings.customFields.every((v, i) => v === defaults.customFields[i]) &&
    settings.quickFillTemplates.length === defaults.quickFillTemplates.length &&
    settings.quickFillTemplates.every((v, i) => v === defaults.quickFillTemplates[i]) &&
    settings.apifoxExportUrl === defaults.apifoxExportUrl &&
    settings.responseErrorRule === defaults.responseErrorRule
  );
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
    quickFillTemplates: Array.isArray(current?.quickFillTemplates)
      ? current.quickFillTemplates.filter(Boolean)
      : defaults.quickFillTemplates,
    apifoxExportUrl:
      typeof current?.apifoxExportUrl === 'string'
        ? current.apifoxExportUrl.trim()
        : defaults.apifoxExportUrl,
    responseErrorRule:
      typeof current?.responseErrorRule === 'string' && current.responseErrorRule.trim()
        ? current.responseErrorRule.trim()
        : defaults.responseErrorRule,
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

    // Wildcard: *.baidu.com matches any subdomain of baidu.com
    if (rule.startsWith('*.')) {
      const suffix = rule.slice(1); // .baidu.com
      return currentHost.endsWith(suffix) || currentHostWithPort.endsWith(suffix);
    }

    return currentHost === rule || currentHostWithPort === rule;
  });
}

interface ParsedResponseErrorRule {
  path: string[];
  operator: '===' | '!==' | '==' | '!=' | '>=' | '<=' | '>' | '<';
  expected: JsonValue;
}

function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRuleLiteral(rawLiteral: string): JsonValue | undefined {
  const trimmedLiteral = rawLiteral.trim();

  if (!trimmedLiteral) {
    return undefined;
  }

  if (
    trimmedLiteral === 'true' ||
    trimmedLiteral === 'false' ||
    trimmedLiteral === 'null' ||
    /^-?\d+(?:\.\d+)?$/.test(trimmedLiteral) ||
    (trimmedLiteral.startsWith('"') && trimmedLiteral.endsWith('"')) ||
    (trimmedLiteral.startsWith('[') && trimmedLiteral.endsWith(']')) ||
    (trimmedLiteral.startsWith('{') && trimmedLiteral.endsWith('}'))
  ) {
    try {
      return JSON.parse(trimmedLiteral) as JsonValue;
    } catch {
      return undefined;
    }
  }

  if (trimmedLiteral.startsWith("'") && trimmedLiteral.endsWith("'")) {
    return trimmedLiteral.slice(1, -1);
  }

  return undefined;
}

function parseResponseErrorRule(rule: string): ParsedResponseErrorRule | undefined {
  const normalizedRule = rule.trim();
  if (!normalizedRule) {
    return undefined;
  }

  const matchedRule = normalizedRule.match(
    /^res((?:\.[A-Za-z_$][\w$]*)+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/,
  );

  if (!matchedRule) {
    return undefined;
  }

  const expected = parseRuleLiteral(matchedRule[3]);
  if (expected === undefined) {
    return undefined;
  }

  return {
    path: matchedRule[1].split('.').filter(Boolean),
    operator: matchedRule[2] as ParsedResponseErrorRule['operator'],
    expected,
  };
}

function getResponseRuleActualValue(
  response: JsonValue | undefined,
  path: string[],
): JsonValue | undefined {
  let currentValue = response;

  for (const segment of path) {
    if (!isJsonObject(currentValue) || !(segment in currentValue)) {
      return undefined;
    }

    currentValue = currentValue[segment];
  }

  return currentValue;
}

export function getResponseMessage(response: JsonValue | undefined): string | undefined {
  const messageValue = getResponseRuleActualValue(response, ['msg']);

  if (typeof messageValue === 'string') {
    return messageValue.trim() || undefined;
  }

  if (typeof messageValue === 'number' || typeof messageValue === 'boolean') {
    return String(messageValue);
  }

  if (messageValue && typeof messageValue === 'object') {
    try {
      const serializedMessage = JSON.stringify(messageValue);
      return serializedMessage || undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function getResponseRtnValue(response: JsonValue | undefined): string | undefined {
  const rtnValue = getResponseRuleActualValue(response, ['rtn']);

  if (typeof rtnValue === 'string') {
    return rtnValue.trim() || undefined;
  }

  if (typeof rtnValue === 'number' || typeof rtnValue === 'boolean') {
    return String(rtnValue);
  }

  return undefined;
}

function compareRuleValues(
  actual: JsonValue | undefined,
  expected: JsonValue,
  operator: ParsedResponseErrorRule['operator'],
): boolean {
  switch (operator) {
    case '===':
      return actual === expected;
    case '!==':
      return actual !== expected;
    case '==':
      // eslint-disable-next-line eqeqeq
      return actual == expected;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return actual != expected;
    case '>=':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case '<=':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case '>':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case '<':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    default:
      return false;
  }
}

export function evaluateResponseErrorRule(
  response: JsonValue | undefined,
  rule: string,
): boolean {
  const parsedRule = parseResponseErrorRule(rule);
  if (!parsedRule) {
    return false;
  }

  const actualValue = getResponseRuleActualValue(response, parsedRule.path);

  // 响应体尚未捕获或路径不存在时，不判定为命中规则
  // 否则 undefined !== 0 会被 JavaScript 判定为 true，导致误报
  if (actualValue === undefined) {
    return false;
  }

  return compareRuleValues(actualValue, parsedRule.expected, parsedRule.operator);
}

export function sanitizeResponseSnapshot(
  value: unknown,
  depth = 0,
): JsonValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return typeof value === 'string' && value.length > 300 ? `${value.slice(0, 300)}...` : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (depth >= 3) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => sanitizeResponseSnapshot(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [key, sanitizeResponseSnapshot(item, depth + 1)] as const)
      .filter((entry): entry is [string, JsonValue] => entry[1] !== undefined);

    return Object.fromEntries(entries);
  }

  return undefined;
}

export function getRequestAbnormalReasons(
  request: Pick<NetworkRequestRecord, 'statusCode' | 'error' | 'responseSnapshot'>,
  responseErrorRule: string,
): string[] {
  const reasons: string[] = [];
  const ruleMatched = evaluateResponseErrorRule(request.responseSnapshot, responseErrorRule);

  if (request.error) {
    reasons.push(request.error);
  }

  if (typeof request.statusCode === 'number' && request.statusCode !== 200) {
    reasons.push(`HTTP ${request.statusCode}`);
  }

  if (request.statusCode === 200 && ruleMatched) {
    reasons.push(`命中响应规则：${responseErrorRule}`);
  }

  return reasons;
}

export function withRequestAbnormalState(
  request: NetworkRequestRecord,
  responseErrorRule: string,
): NetworkRequestRecord {
  const abnormalReasons = getRequestAbnormalReasons(request, responseErrorRule);
  const responseMessage = getResponseMessage(request.responseSnapshot);

  return {
    ...request,
    responseRuleMatched: abnormalReasons.some((reason) => reason.startsWith('命中响应规则：')),
    responseMessage,
    abnormalReasons: abnormalReasons.length > 0 ? abnormalReasons : undefined,
  };
}

function formatAbnormalReasonForCopy(request: NetworkRequestRecord): string {
  const abnormalReasons = request.abnormalReasons ?? [];
  const responseMessage = request.responseMessage ?? getResponseMessage(request.responseSnapshot);
  const responseRtn = getResponseRtnValue(request.responseSnapshot);
  const matchedResponseRule =
    request.responseRuleMatched ||
    abnormalReasons.some((reason) => reason.startsWith('命中响应规则：'));

  if (typeof request.statusCode === 'number' && request.statusCode !== 200) {
    return `status 状态为 {${request.statusCode}}`;
  }

  if (matchedResponseRule && responseRtn && responseMessage) {
    return `{rtn: ${responseRtn}, msg: "${responseMessage}" }`;
  }

  if (matchedResponseRule && responseRtn) {
    return `{rtn: ${responseRtn}}`;
  }

  if (matchedResponseRule && responseMessage) {
    return `{msg: "${responseMessage}" }`;
  }

  return abnormalReasons[0] ?? 'N/A';
}

export function buildFeedbackText(payload: CopyPayload): string {
  const normalizedTitle = payload.feedbackTitle.trim() || '页面接口信息如下';
  const normalizedNote = payload.note.trim() || 'N/A';
  const normalizedScreenshotLabel = payload.screenshotLabel.trim() || 'N/A';
  const abnormalRequestsTitle =
    payload.requests.length > 1 ? `接口信息-${payload.requests.length}条接口` : '接口信息';
  const sections: string[] = [
    `- 问题：${normalizedNote}`,
    `- 截图：${normalizedScreenshotLabel}`,
    '',
    `=== ${normalizedTitle}`,
    '',
    'Web 信息：',
    '',
    `- 页面 URL：${payload.page.url || 'N/A'}`,
    `- 页面标题：${payload.page.title || 'N/A'}`,
    '',
    `${abnormalRequestsTitle}：`,
    '',
  ];

  if (payload.requests.length === 0) {
    sections.push('- 未选择异常接口');
  } else {
    payload.requests.forEach((request, index) => {
      if (request.apiName) {
        sections.push(`- 接口名: ${request.apiName}`);
      }
      sections.push(`- ${request.method.toUpperCase()} ${getUrlAfterOrigin(request.url)}`);
      sections.push(`- traceId: ${getTraceId(request.headers)}`);
      sections.push(`- 状态码: ${request.statusCode ?? 'N/A'}`);
      if (request.abnormalReasons && request.abnormalReasons.length > 0) {
        sections.push(`- 异常原因: ${formatAbnormalReasonForCopy(request)}`);
      }
      sections.push(`- 请求时间: ${formatTime(request.startedAt)}`);
      sections.push(`- 耗时: ${formatDuration(request.startedAt, request.completedAt)}`);
      sections.push(`- apifox: ${request.apifoxUrl ?? 'N/A'}`);

      if (payload.includeRequestParams && request.requestParams) {
        sections.push('- 接口入参:');
        const formatted = JSON.stringify(request.requestParams, null, 2);
        formatted.split('\n').forEach((line) => {
          sections.push(`  ${line}`);
        });
      }

      if (index < payload.requests.length - 1) {
        sections.push('');
      }
    });
  }

  sections.push('');
  if (payload.customFields.length !== 0) {
    sections.push('---');
    sections.push('');
    payload.customFields.forEach((field) => {
      sections.push(`- ${field}`);
    });
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

export function getApifoxPathCandidates(path: string): string[] {
  const candidates = [path];
  const fallbackPatterns = [/^\/api\/[^/]+\/v\d+(?=\/|$)/i, /^\/api\/[^/]+(?=\/|$)/i];

  fallbackPatterns.forEach((pattern) => {
    const trimmedPath = path.replace(pattern, '') || '/';
    if (trimmedPath !== path && !candidates.includes(trimmedPath)) {
      candidates.push(trimmedPath);
    }
  });

  return candidates;
}

export function normalizeApifoxUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return '';
  }

  return trimmedUrl.replace(/-run(?=[?#]|$)/, '');
}

export function buildApifoxLookupMaps(schema: unknown): ApifoxLookupMaps {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Apifox 导出内容格式不正确。');
  }

  const paths = (schema as { paths?: Record<string, unknown> }).paths;
  if (!paths || typeof paths !== 'object') {
    throw new Error('Apifox 导出内容中未找到 paths 字段。');
  }

  const endpointMap = new Map<string, string>();
  const pathMap = new Map<string, string>();
  const endpointNameMap = new Map<string, string>();
  let endpointCount = 0;

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

      const normalizedMethod = normalizeApifoxMethod(method);
      const lookupKey = getApifoxLookupKey(path, normalizedMethod);
      endpointMap.set(lookupKey, apifoxUrl);
      if (!pathMap.has(path)) {
        pathMap.set(path, apifoxUrl);
      }

      const summary = (operation as { summary?: unknown }).summary;
      if (typeof summary === 'string' && summary.trim()) {
        endpointNameMap.set(lookupKey, summary.trim());
      }

      endpointCount += 1;
    });
  });

  return {
    endpointMap,
    pathMap,
    endpointNameMap,
    endpointCount,
  };
}
