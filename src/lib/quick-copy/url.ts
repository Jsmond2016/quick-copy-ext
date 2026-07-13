import { TRACE_HEADER_KEYS } from './constants';
import type { EnvironmentConfig, HeaderRecord } from './types';

function getLastVisiblePath(rawPath: string): string {
  const segments = rawPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return rawPath || '/';
  }

  const visiblePath = segments.slice(-3).join('/');
  const prefix = segments.length > 3 ? '/.../' : '/';

  return `${prefix}${visiblePath}`;
}

function getUrlPathAndSearch(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return rawUrl;
  }
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

  return '-';
}

export function getCompactText(value: string, head = 8, tail = 6): string {
  if (!value) {
    return '-';
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function getDisplayPath(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    const suffix = `${parsedUrl.search}${parsedUrl.hash}`;
    return `${getLastVisiblePath(parsedUrl.pathname)}${suffix}`;
  } catch {
    const [path = rawUrl, suffix = ''] = rawUrl.split(/(?=[?#])/);
    return `${getLastVisiblePath(path)}${suffix}`;
  }
}

export function getUrlAfterOrigin(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    return `${parsedUrl.pathname || '/'}${parsedUrl.search}${parsedUrl.hash}`;
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

export function getApifoxProjectId(exportUrl: string): string {
  const trimmed = exportUrl.trim();
  if (!trimmed) return '';

  // 兼容旧版本存储的完整本地 URL 格式（http://127.0.0.1:4523/export/openapi?projectId=...）
  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).searchParams.get('projectId')?.trim() ?? '';
    } catch {
      return '';
    }
  }

  return trimmed;
}

export function buildApifoxExportUrl(projectId: string): string {
  return projectId.trim();
}

export function matchesApiPrefixes(url: string, prefixes: string[]): boolean {
  if (prefixes.length === 0) {
    return true;
  }

  const normalizedPrefixes = prefixes.map((item) => item.trim()).filter(Boolean);
  if (normalizedPrefixes.length === 0) {
    return true;
  }

  const pathAndSearch = getUrlPathAndSearch(url);
  return normalizedPrefixes.some((prefix) => pathAndSearch.startsWith(prefix) || url.startsWith(prefix));
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

    if (rule.startsWith('*.')) {
      const suffix = rule.slice(1);
      return currentHost.endsWith(suffix) || currentHostWithPort.endsWith(suffix);
    }

    return currentHost === rule || currentHostWithPort === rule;
  });
}

export function getUrlPath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname || '/';
  } catch {
    const [path = rawUrl] = rawUrl.split(/[?#]/);
    return path || '/';
  }
}

export function normalizeBatchQuickMockUrl(rawUrl: string): string {
  const path = getUrlPath(rawUrl).trim().replace(/\/{2,}/g, '/');

  if (!path) {
    return '';
  }

  if (path === '/') {
    return path;
  }

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

export function dedupeBatchQuickMockUrls(rawUrls: string[]): string[] {
  const seen = new Set<string>();

  return rawUrls.reduce<string[]>((result, rawUrl) => {
    const normalizedUrl = normalizeBatchQuickMockUrl(rawUrl);

    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return result;
    }

    seen.add(normalizedUrl);
    result.push(normalizedUrl);
    return result;
  }, []);
}

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/**
 * 环境标记 → 环境名称映射（不区分大小写匹配）。
 * 用于从 API 请求的 `x-forwarded-for` 响应头中检测当前调试环境。
 */
const ENV_MARKERS: Array<{ marker: string; name: string }> = [
  { marker: '.fat.', name: 'FAT' },
  { marker: '.uat.', name: 'UAT' },
  { marker: '.pro.', name: 'PROD' },
];

/** 优先用于环境检测的响应头字段名。 */
const ENV_HEADER_KEY = 'x-forwarded-for';

/**
 * 将用户填写的环境网址（可能缺少协议，如 `www.fat.baidu.com`）补全为完整 URL 对象。
 * 解析失败时返回 null。
 */
function parseEnvironmentUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
}

/** 当前页面是否运行在本地（hostname 完全等于 localhost 或 127.0.0.1）。 */
export function isLocalhostUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return LOCALHOST_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

/**
 * 校验环境网址是否可用（补全协议后能解析出 hostname）。
 */
export function isValidEnvironmentUrl(rawUrl: string): boolean {
  return parseEnvironmentUrl(rawUrl) !== null;
}

/**
 * 构建环境跳转地址：
 * - 无论是 localhost 还是其他环境，都把当前页面的 pathname + search + hash 拼到目标环境域名上
 * 解析失败时返回空字符串。
 */
export function buildEnvironmentUrl(envUrl: string, currentUrl: string): string {
  const target = parseEnvironmentUrl(envUrl);

  if (!target) {
    return '';
  }

  try {
    const current = new URL(currentUrl);
    target.pathname = current.pathname;
    target.search = current.search;
    target.hash = current.hash;
    return target.toString();
  } catch {
    return target.toString();
  }
}

/**
 * 返回当前域名之外的其他环境配置，最多 max 个（默认 2）。
 * 用于顶部导航 badge：在当前环境以外展示可跳转的其他环境。
 */
export function getOtherEnvironments(
  currentUrl: string,
  environments: Array<{ name: string; url: string }>,
  max = 2,
): Array<{ name: string; url: string }> {
  if (environments.length === 0) {
    return [];
  }

  let currentOrigin = '';
  try {
    currentOrigin = new URL(currentUrl).origin.toLowerCase();
  } catch {
    // 无法解析则不过滤，全部保留
  }

  const configuredEnvironments = environments.filter((environment) => parseEnvironmentUrl(environment.url));
  const others = currentOrigin
    ? configuredEnvironments.filter((env) => {
        const parsed = parseEnvironmentUrl(env.url);
        return parsed?.origin.toLowerCase() !== currentOrigin;
      })
    : configuredEnvironments;

  const uniqueNames = new Set<string>();
  return others.filter((environment) => {
    const name = environment.name.toUpperCase();
    if (uniqueNames.has(name)) return false;
    uniqueNames.add(name);
    return true;
  }).slice(0, max);
}

/**
 * 匹配当前页面 URL 属于哪个环境配置。
 * 通过对比 origin 来判断。
 */
export function matchCurrentEnvironment(
  currentUrl: string,
  environments: EnvironmentConfig[],
): EnvironmentConfig | null {
  if (!currentUrl || environments.length === 0) {
    return null;
  }

  try {
    const currentOrigin = new URL(currentUrl).origin.toLowerCase();

    for (const env of environments) {
      const envParsed = parseEnvironmentUrl(env.url);
      if (envParsed && envParsed.origin.toLowerCase() === currentOrigin) {
        return env;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 通过已捕获的 API 请求检测当前调试环境。
 *
 * 检测规则（按优先级）：
 * 1. 请求响应头 `x-forwarded-for` 的值含 `.fat.` → FAT
 * 2. 请求响应头 `x-forwarded-for` 的值含 `.uat.` → UAT
 * 3. 请求响应头 `x-forwarded-for` 的值含 `.pro.` → PROD
 * 4. 降级检查请求 URL（同上标记）
 * 5. 有请求但无标记命中 → PROD（生产环境）
 *
 * 匹配成功后会在 `environments` 列表中查找对应名称的配置，找不到则返回仅含名称的对象。
 */
export function detectEnvironmentFromRequests(
  requests: Array<{ url: string; headers: Record<string, string> }>,
  environments: EnvironmentConfig[],
): EnvironmentConfig | null {
  if (requests.length === 0) {
    return null;
  }

  // 多域名配置下，精确 origin 匹配能定位到对应的具体配置项。
  for (const request of requests) {
    const configured = matchCurrentEnvironment(request.url, environments);
    if (configured) return configured;
  }

  function matchEnv(source: string): EnvironmentConfig | null {
    const lower = source.toLowerCase();
    for (const { marker, name } of ENV_MARKERS) {
      if (lower.includes(marker)) {
        const configured = environments.find(
          (env) => env.name.toUpperCase() === name && env.url,
        ) ?? environments.find((env) => env.name.toUpperCase() === name);
        return configured ?? { id: `env-${name.toLowerCase()}`, name, url: '' };
      }
    }
    return null;
  }

  // 优先从 x-forwarded-for 响应头检测
  for (const request of requests) {
    const forwarded = request.headers?.[ENV_HEADER_KEY];
    if (forwarded) {
      const matched = matchEnv(forwarded);
      if (matched) return matched;
    }
  }

  // 降级：从请求 URL 中检测
  for (const request of requests) {
    const matched = matchEnv(request.url);
    if (matched) return matched;
  }

  // 有请求但无标记命中 → 生产环境
  const configured = environments.find(
    (env) => env.name.toUpperCase() === 'PROD' && env.url,
  ) ?? environments.find((env) => env.name.toUpperCase() === 'PROD');
  return configured ?? { id: 'env-prod', name: 'PROD', url: '' };
}
