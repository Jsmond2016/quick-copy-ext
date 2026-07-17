export const MAX_REQUESTS_PER_TAB = 200;
export const MAX_PAGE_ERRORS_PER_TAB = 20;
export const PAGE_ERROR_RELATED_REQUEST_BEFORE_MS = 10_000;
export const PAGE_ERROR_RELATED_REQUEST_AFTER_MS = 3_000;
export const SETTINGS_STORAGE_KEY = 'quick-copy-settings';
export const DEFAULT_RESPONSE_ERROR_RULE = JSON.stringify(
  [
    {
      label: '接口异常',
      expression: 'res.rtn !== 0',
    },
  ],
  null,
  2,
);

export const TRACE_HEADER_KEYS = ['traceid', 'trace-id', 'x-trace-id', 'x-b3-traceid'];
