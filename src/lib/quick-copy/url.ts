import { TRACE_HEADER_KEYS } from './constants';
import type { HeaderRecord } from './types';

const APIFOX_EXPORT_BASE_URL = 'http://127.0.0.1:4523/export/openapi';
const APIFOX_EXPORT_SPECIAL_PURPOSE = 'openapi-generator';

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
  try {
    return new URL(exportUrl).searchParams.get('projectId')?.trim() ?? '';
  } catch {
    return '';
  }
}

export function buildApifoxExportUrl(projectId: string): string {
  const trimmedProjectId = projectId.trim();

  if (!trimmedProjectId) {
    return '';
  }

  const url = new URL(APIFOX_EXPORT_BASE_URL);
  url.searchParams.set('projectId', trimmedProjectId);
  url.searchParams.set('specialPurpose', APIFOX_EXPORT_SPECIAL_PURPOSE);
  return url.toString();
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
