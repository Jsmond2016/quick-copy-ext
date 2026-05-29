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
  developerMode: boolean;
  quickMockTargetExtensionId: string;
}

export type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number }
  | { type: 'quick-copy/get-apifox-status' }
  | { type: 'quick-copy/refresh-apifox-data'; exportUrl: string }
  | { type: 'quick-copy/clear-apifox-data' }
  | { type: 'quick-copy/get-apifox-matches'; requests: Pick<NetworkRequestRecord, 'url' | 'method'>[] }
  | { type: 'quick-copy/report-response-body'; payload: CapturedResponsePayload };

export interface RuntimeEventMessage {
  type: 'quick-copy/tab-requests-updated';
  tabId: number;
}

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
