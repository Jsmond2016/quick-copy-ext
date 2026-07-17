import {
  MAX_PAGE_ERRORS_PER_TAB,
  type CapturedPageErrorPayload,
  type PageErrorKind,
  type PageErrorRecord,
} from '@src/lib/quick-copy';

const PAGE_ERROR_SESSION_CACHE_KEY = 'quick-copy-page-error-session-cache';
const DUPLICATE_WINDOW_MS = 5_000;
const VALID_ERROR_KINDS = new Set<PageErrorKind>([
  'runtime',
  'unhandledrejection',
  'resource',
]);

interface SerializedPageErrorCache {
  errorsByTab: [number, PageErrorRecord[]][];
}

interface PageErrorStore {
  report(
    tabId: number,
    payload: CapturedPageErrorPayload,
    senderUrl?: string,
  ): Promise<boolean>;
  get(tabId: number): Promise<PageErrorRecord[]>;
  clear(tabId: number, shouldNotify?: boolean): Promise<void>;
}

function truncate(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.slice(0, maxLength);
}

function sanitizePayload(payload: CapturedPageErrorPayload): CapturedPageErrorPayload | null {
  const kind = payload?.kind;
  const message = truncate(payload?.message, 1_000);
  const pageUrl = truncate(payload?.pageUrl, 2_000);

  if (!VALID_ERROR_KINDS.has(kind) || !message || !pageUrl) {
    return null;
  }

  const now = Date.now();
  const occurredAt = Number.isFinite(payload.occurredAt)
    && Math.abs(payload.occurredAt - now) <= 60_000
    ? payload.occurredAt
    : now;

  return {
    kind,
    message,
    pageUrl,
    occurredAt,
    name: truncate(payload.name, 120),
    stack: truncate(payload.stack, 8_000),
    filename: truncate(payload.filename, 2_000),
    resourceUrl: truncate(payload.resourceUrl, 2_000),
    lineNumber: Number.isFinite(payload.lineNumber) ? payload.lineNumber : undefined,
    columnNumber: Number.isFinite(payload.columnNumber) ? payload.columnNumber : undefined,
  };
}

function isDuplicate(current: PageErrorRecord, payload: CapturedPageErrorPayload): boolean {
  return current.kind === payload.kind
    && current.message === payload.message
    && current.filename === payload.filename
    && current.lineNumber === payload.lineNumber
    && current.columnNumber === payload.columnNumber
    && Math.abs(current.occurredAt - payload.occurredAt) <= DUPLICATE_WINDOW_MS;
}

export function createPageErrorStore(
  shouldAccept: (tabId: number, senderUrl?: string) => boolean,
): PageErrorStore {
  const errorsByTab = new Map<number, PageErrorRecord[]>();

  const readyPromise = chrome.storage.session.get(PAGE_ERROR_SESSION_CACHE_KEY)
    .then((stored) => {
      const payload = stored[PAGE_ERROR_SESSION_CACHE_KEY] as SerializedPageErrorCache | undefined;
      payload?.errorsByTab?.forEach(([tabId, records]) => {
        if (typeof tabId !== 'number' || !Array.isArray(records)) {
          return;
        }

        errorsByTab.set(
          tabId,
          records
            .filter((record): record is PageErrorRecord => Boolean(record) && typeof record === 'object')
            .slice(0, MAX_PAGE_ERRORS_PER_TAB),
        );
      });
    })
    .catch(() => undefined);

  function persist(): Promise<void> {
    const payload: SerializedPageErrorCache = {
      errorsByTab: Array.from(errorsByTab.entries()),
    };
    return chrome.storage.session.set({ [PAGE_ERROR_SESSION_CACHE_KEY]: payload });
  }

  function notify(tabId: number): void {
    void chrome.runtime.sendMessage({
      type: 'quick-copy/page-errors-updated',
      tabId,
    }).catch(() => undefined);
  }

  function setBadge(tabId: number, visible: boolean): void {
    if (!chrome.action) {
      return;
    }

    void chrome.action.setBadgeBackgroundColor({ tabId, color: '#b42318' }).catch(() => undefined);
    void chrome.action.setBadgeText({ tabId, text: visible ? '!' : '' }).catch(() => undefined);
  }

  return {
    async report(
      tabId: number,
      rawPayload: CapturedPageErrorPayload,
      senderUrl?: string,
    ): Promise<boolean> {
      await readyPromise;
      const payload = sanitizePayload(rawPayload);

      if (!payload || !shouldAccept(tabId, senderUrl)) {
        return false;
      }

      const current = errorsByTab.get(tabId) ?? [];
      if (current.some((record) => isDuplicate(record, payload))) {
        return true;
      }

      const record: PageErrorRecord = {
        ...payload,
        id: crypto.randomUUID?.() ?? `${tabId}-${payload.occurredAt}-${current.length}`,
        tabId,
      };
      errorsByTab.set(tabId, [record, ...current].slice(0, MAX_PAGE_ERRORS_PER_TAB));
      await persist();
      setBadge(tabId, true);
      notify(tabId);
      return true;
    },
    async get(tabId: number): Promise<PageErrorRecord[]> {
      await readyPromise;
      setBadge(tabId, false);
      return errorsByTab.get(tabId) ?? [];
    },
    async clear(tabId: number, shouldNotify = true): Promise<void> {
      await readyPromise;
      errorsByTab.delete(tabId);
      await persist();
      setBadge(tabId, false);
      if (shouldNotify) {
        notify(tabId);
      }
    },
  };
}
