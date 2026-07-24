import type { ScreenshotSession, ScreenshotSource } from '@src/lib/quick-copy';

export function isScreenshotSupported(): boolean {
  return typeof chrome.tabs.captureVisibleTab === 'function'
    && typeof chrome.offscreen?.createDocument === 'function';
}

interface ScreenshotService {
  dispose: (sessionId: string) => Promise<void>;
  handleTabRemoved: (tabId: number) => Promise<void>;
  handleTabUpdated: (tabId: number) => Promise<void>;
  start: (tabId: number, source: ScreenshotSource) => Promise<void>;
}

function isSupportedPage(url?: string): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isMissingReceiverError(error: unknown): boolean {
  return getErrorMessage(error, '').includes('Receiving end does not exist');
}

export function createScreenshotService(): ScreenshotService {
  let activeSession: ScreenshotSession | undefined;

  async function ensureContentScript(tabId: number): Promise<void> {
    const scriptFile = chrome.runtime.getManifest().content_scripts
      ?.flatMap((contentScript) => contentScript.js ?? [])
      .at(0);
    if (!scriptFile) throw new Error('未找到截图编辑器脚本。');
    await chrome.scripting.executeScript({ target: { tabId }, files: [scriptFile] });
  }

  async function sendToTab(tabId: number, message: Record<string, unknown>): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      if (!isMissingReceiverError(error)) throw error;
      await ensureContentScript(tabId);
      await chrome.tabs.sendMessage(tabId, message);
    }
  }

  async function dispose(sessionId: string): Promise<void> {
    if (!activeSession || activeSession.id !== sessionId) return;
    const session = activeSession;
    activeSession = undefined;
    await sendToTab(session.tabId, { type: 'quick-copy/close-screenshot-editor', sessionId }).catch(() => undefined);
  }

  return {
    async start(tabId) {
      if (!isScreenshotSupported()) throw new Error('当前浏览器不支持截图标注。');
      const tab = await chrome.tabs.get(tabId);
      if (!tab.active || !isSupportedPage(tab.url) || typeof tab.windowId !== 'number') {
        throw new Error('当前页面不支持截图。');
      }
      if (activeSession) await dispose(activeSession.id);

      let imageDataUrl: string;
      try {
        imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      } catch (error) {
        throw new Error(getErrorMessage(error, '截图失败，请确认当前页面允许扩展访问。'));
      }
      const session: ScreenshotSession = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tabId,
        windowId: tab.windowId,
      };
      activeSession = session;
      try {
        await sendToTab(tabId, { type: 'quick-copy/open-screenshot-editor', sessionId: session.id, imageDataUrl });
      } catch (error) {
        activeSession = undefined;
        throw new Error(getErrorMessage(error, '无法在当前页面打开截图编辑器。'));
      }
    },
    dispose,
    async handleTabRemoved(tabId) {
      if (activeSession?.tabId === tabId) await dispose(activeSession.id);
    },
    async handleTabUpdated(tabId) {
      if (activeSession?.tabId === tabId) await dispose(activeSession.id);
    },
  };
}
