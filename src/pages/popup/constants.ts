import { ApifoxCacheStatus, PageSummary } from '@src/lib/quick-copy';

export const DEFAULT_PAGE: PageSummary = {
  title: '',
  url: '',
};

export const DEFAULT_APIFOX_STATUS: ApifoxCacheStatus = {
  ready: false,
  sourceUrl: '',
  endpointCount: 0,
};
