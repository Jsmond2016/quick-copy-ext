import {
  CapturedResponsePayload,
  JsonValue,
  NetworkRequestRecord,
  sanitizeResponseSnapshot,
  withRequestAbnormalState,
  getMatchedResponseErrorRules,
} from '@src/lib/quick-copy';

interface ApplyCapturedResponseOptions {
  getRecordsByTabId: (tabId: number) => NetworkRequestRecord[];
  replaceRequestRecord: (record: NetworkRequestRecord) => void;
  responseErrorRule: string;
}

function getResponseDebugSummary(
  response: JsonValue | undefined,
): { listLength: number; paginationState: 'missing' | 'null' | 'present' } | null {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return null;
  }

  const data = (response as Record<string, JsonValue>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const list = (data as Record<string, JsonValue>).list;
  if (!Array.isArray(list)) {
    return null;
  }

  const pagination = (data as Record<string, JsonValue>).pagination;

  return {
    listLength: list.length,
    paginationState:
      pagination === undefined ? 'missing' : pagination === null ? 'null' : 'present',
  };
}

function findBestMatchingRequest(
  tabId: number,
  payload: CapturedResponsePayload,
  records: NetworkRequestRecord[],
): NetworkRequestRecord | undefined {
  const normalizedMethod = payload.method.toUpperCase();

  return records
    .filter(
      (record) =>
        record.url === payload.url &&
        record.method.toUpperCase() === normalizedMethod &&
        Math.abs(record.startedAt - payload.startedAt) <= 15000,
    )
    .sort((left, right) => {
      const leftDiff = Math.abs(left.startedAt - payload.startedAt);
      const rightDiff = Math.abs(right.startedAt - payload.startedAt);

      if (leftDiff !== rightDiff) {
        return leftDiff - rightDiff;
      }

      const leftHasResponse = left.responseSnapshot !== undefined ? 1 : 0;
      const rightHasResponse = right.responseSnapshot !== undefined ? 1 : 0;
      return leftHasResponse - rightHasResponse;
    })[0];
}

export function applyCapturedResponse(
  tabId: number,
  payload: CapturedResponsePayload,
  options: ApplyCapturedResponseOptions,
): void {
  const matchedRequest = findBestMatchingRequest(
    tabId,
    payload,
    options.getRecordsByTabId(tabId),
  );
  if (!matchedRequest) {
    const unmatchedSummary = getResponseDebugSummary(payload.response);
    if (unmatchedSummary) {
      console.log('[Quick Copy Ext] response payload not matched', {
        tabId,
        url: payload.url,
        method: payload.method,
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        summary: unmatchedSummary,
        response: payload.response,
      });
    }
    return;
  }

  const requestParams: Record<string, unknown> | undefined =
    payload.requestParams !== undefined
      ? (payload.requestParams as Record<string, unknown>)
      : matchedRequest.requestParams;

  const responseSnapshot =
    payload.response === undefined
      ? matchedRequest.responseSnapshot
      : sanitizeResponseSnapshot(payload.response);
  const debugSummary = getResponseDebugSummary(responseSnapshot);
  const matchedRules = getMatchedResponseErrorRules(
    responseSnapshot,
    options.responseErrorRule,
  ).map((rule) => rule.label);

  if (debugSummary) {
    console.log('[Quick Copy Ext] apply captured response', {
      tabId,
      requestId: matchedRequest.requestId,
      recordId: matchedRequest.id,
      url: payload.url,
      method: payload.method,
      startedAt: payload.startedAt,
      completedAt: payload.completedAt,
      statusCode: payload.statusCode ?? matchedRequest.statusCode,
      summary: debugSummary,
      matchedRules,
      rawResponse: payload.response,
      responseSnapshot,
    });
  }

  options.replaceRequestRecord(
    withRequestAbnormalState(
      {
        ...matchedRequest,
        statusCode: payload.statusCode ?? matchedRequest.statusCode,
        completedAt: payload.completedAt || matchedRequest.completedAt,
        responseSnapshot,
        requestParams,
      },
      options.responseErrorRule,
    ),
  );
}
