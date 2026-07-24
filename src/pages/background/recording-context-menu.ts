import type { RecordingSession } from '@src/lib/quick-copy';

const RECORDING_CONTEXT_MENU_ID = 'quick-copy/recording';
const HTTP_PAGE_PATTERNS = ['http://*/*', 'https://*/*'];

interface RecordingContextMenuOptions {
  getLatest: () => Promise<RecordingSession>;
  pause: (tabId: number) => Promise<unknown>;
  resume: (tabId: number) => Promise<unknown>;
  start: (tabId: number) => Promise<unknown>;
  stop: (tabId: number) => Promise<unknown>;
}

export interface RecordingContextMenuController {
  update: (session: RecordingSession) => void;
}

function getMenuItems(session: RecordingSession): chrome.contextMenus.CreateProperties[] {
  const base: Pick<chrome.contextMenus.CreateProperties, 'contexts' | 'documentUrlPatterns'> = {
    contexts: ['page'],
    documentUrlPatterns: HTTP_PAGE_PATTERNS,
  };
  if (session.status === 'recording') {
    return [
      { ...base, id: `${RECORDING_CONTEXT_MENU_ID}/pause`, title: 'Quick Copy：暂停录制' },
      { ...base, id: `${RECORDING_CONTEXT_MENU_ID}/stop`, title: 'Quick Copy：结束并保存录制' },
    ];
  }

  if (session.status === 'paused') {
    return [
      { ...base, id: `${RECORDING_CONTEXT_MENU_ID}/resume`, title: 'Quick Copy：继续录制' },
      { ...base, id: `${RECORDING_CONTEXT_MENU_ID}/stop`, title: 'Quick Copy：结束并保存录制' },
    ];
  }

  if (session.status === 'saving') {
    return [{ ...base, id: `${RECORDING_CONTEXT_MENU_ID}/saving`, title: 'Quick Copy：录制已结束，等待浏览器完成保存', enabled: false }];
  }

  return [{ ...base, id: `${RECORDING_CONTEXT_MENU_ID}/start`, title: 'Quick Copy：开始录制当前窗口' }];
}

export function registerRecordingContextMenu({
  getLatest,
  pause,
  resume,
  start,
  stop,
}: RecordingContextMenuOptions): RecordingContextMenuController {
  if (!chrome.contextMenus) {
    return { update: () => undefined };
  }

  let menuUpdate = Promise.resolve();

  function update(session: RecordingSession): void {
    menuUpdate = menuUpdate
      .catch(() => undefined)
      .then(() => chrome.contextMenus.removeAll())
      .then(() => {
        getMenuItems(session).forEach((item) => chrome.contextMenus.create(item));
      });
  }

  void getLatest().then(update).catch(() => update({ status: 'idle' }));
  chrome.runtime.onInstalled.addListener(() => update({ status: 'idle' }));
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!String(info.menuItemId).startsWith(RECORDING_CONTEXT_MENU_ID)) {
      return;
    }

    const action = String(info.menuItemId).replace(`${RECORDING_CONTEXT_MENU_ID}/`, '');
    if (typeof tab?.id !== 'number') {
      return;
    }
    const handlers: Record<string, (tabId: number) => Promise<unknown>> = {
      start,
      pause,
      resume,
      stop,
    };
    void handlers[action]?.(tab.id).catch(() => undefined);
  });

  return { update };
}
