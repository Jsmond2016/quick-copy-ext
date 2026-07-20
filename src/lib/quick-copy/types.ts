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

export type PageErrorKind = 'runtime' | 'unhandledrejection' | 'resource';

export interface CapturedPageErrorPayload {
  kind: PageErrorKind;
  message: string;
  name?: string;
  stack?: string;
  filename?: string;
  lineNumber?: number;
  columnNumber?: number;
  resourceUrl?: string;
  pageUrl: string;
  occurredAt: number;
}

export interface PageErrorRecord extends CapturedPageErrorPayload {
  id: string;
  tabId: number;
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
  selectedEnvironment?: {
    name: string;
    url: string;
  };
}

export type QuickCopyMode = 'default' | 'developer' | 'tester';

export interface TesterAioConfig {
  id: string;
  iterationName: string;
  bugUrl: string;
}

export interface EnvironmentConfig {
  id: string;
  name: string;
  url: string;
}

export interface EnvironmentGroupConfig {
  id: string;
  name: string;
  environments: EnvironmentConfig[];
}

export interface QuickCopySettings {
  feedbackTitle: string;
  monitoredOrigins: string[];
  apiPrefixes: string[];
  customFields: string[];
  quickFillTemplates: string[];
  apifoxExportUrl: string;
  apifoxAuthToken: string;
  responseErrorRule: string;
  mode: QuickCopyMode;
  quickMockTargetExtensionId: string;
  testerAioConfigs: TesterAioConfig[];
  environmentGroups: EnvironmentGroupConfig[];
}

export type RuntimeRequestMessage =
  | { type: 'quick-copy/get-tab-requests'; tabId: number }
  | { type: 'quick-copy/clear-tab-requests'; tabId: number }
  | { type: 'quick-copy/get-apifox-status' }
  | { type: 'quick-copy/refresh-apifox-data'; exportUrl: string; authToken: string }
  | { type: 'quick-copy/clear-apifox-data' }
  | { type: 'quick-copy/get-apifox-matches'; requests: Pick<NetworkRequestRecord, 'url' | 'method'>[] }
  | { type: 'quick-copy/report-response-body'; payload: CapturedResponsePayload }
  | { type: 'quick-copy/report-page-error'; payload: CapturedPageErrorPayload }
  | { type: 'quick-copy/get-page-monitoring-state' }
  | { type: 'quick-copy/page-session-started' }
  | { type: 'quick-copy/open-popup' }
  | { type: 'quick-copy/get-tab-page-errors'; tabId: number }
  | { type: 'quick-copy/clear-tab-page-errors'; tabId: number };

export type RuntimeEventMessage =
  | { type: 'quick-copy/tab-requests-updated'; tabId: number }
  | { type: 'quick-copy/page-errors-updated'; tabId: number };

export type RuntimeResponseMessage =
  | { ok: true; data: NetworkRequestRecord[] }
  | { ok: false; error: string };

export type PageErrorsResponse =
  | { ok: true; data: PageErrorRecord[] }
  | { ok: false; error: string };

export type ReportPageErrorResponse =
  | { ok: true; data: { accepted: boolean } }
  | { ok: false; error: string };

export type PageMonitoringStateResponse =
  | { ok: true; data: { enabled: boolean } }
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
