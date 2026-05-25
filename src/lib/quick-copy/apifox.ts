import type { ApifoxLookupMaps } from './types';
import { getUrlPath } from './url';

export { getUrlPath };

export function normalizeApifoxMethod(method: string): string {
  return method.trim().toLowerCase();
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
