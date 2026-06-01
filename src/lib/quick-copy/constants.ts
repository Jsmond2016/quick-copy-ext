export const MAX_REQUESTS_PER_TAB = 200;
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
