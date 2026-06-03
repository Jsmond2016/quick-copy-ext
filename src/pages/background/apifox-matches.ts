import {
  ApifoxMatchResult,
  getApifoxLookupKey,
  getApifoxPathCandidates,
  getUrlPath,
  NetworkRequestRecord,
} from '@src/lib/quick-copy';

interface GetApifoxMatchesOptions {
  endpointMap: Map<string, string>;
  nameMap: Map<string, string>;
  pathMap: Map<string, string>;
}

export function getApifoxMatches(
  requests: Pick<NetworkRequestRecord, 'url' | 'method'>[],
  options: GetApifoxMatchesOptions,
): Record<string, ApifoxMatchResult> {
  const result: Record<string, ApifoxMatchResult> = {};

  requests.forEach((request) => {
    const path = getUrlPath(request.url);
    const candidates = getApifoxPathCandidates(path);

    let matchedUrl: string | undefined;
    let matchedName: string | undefined;

    for (const candidatePath of candidates) {
      const exactKey = getApifoxLookupKey(candidatePath, request.method);

      if (!matchedUrl) {
        matchedUrl = options.endpointMap.get(exactKey) ?? options.pathMap.get(candidatePath);
      }
      if (!matchedName) {
        matchedName = options.nameMap.get(exactKey);
      }
      if (matchedUrl && matchedName) {
        break;
      }
    }

    if (matchedUrl) {
      result[`${request.method.toUpperCase()} ${request.url}`] = {
        apifoxUrl: matchedUrl,
        apiName: matchedName,
      };
    }
  });

  return result;
}
