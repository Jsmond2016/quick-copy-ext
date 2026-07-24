import {
  buildRecordingDownloadFileName,
  loadRecordingSettings,
  type RecordingSource,
  type RecordingSession,
} from '@src/lib/quick-copy';

const RECORDING_SESSION_CACHE_KEY = 'quick-copy-recording-session';
const OFFSCREEN_DOCUMENT_PATH = 'src/pages/offscreen/recording.html';

interface StartRecordingOptions {
  tabId: number;
  streamId: string;
  source?: RecordingSource;
}

interface StopRecordingPayload {
  tabId: number;
  blobUrl: string;
  fileName: string;
  recordingId?: string;
}

interface RecordingService {
  get(tabId: number): Promise<RecordingSession>;
  getLatest(): Promise<RecordingSession>;
  showHistory(): Promise<void>;
  clearPreview(): Promise<void>;
  start(options: StartRecordingOptions): Promise<RecordingSession>;
  startWindow(tabId: number): Promise<RecordingSession>;
  startFromContextMenu(tabId: number): Promise<RecordingSession>;
  startWindowFromContextMenu(tabId: number): Promise<RecordingSession>;
  pause(tabId: number): Promise<RecordingSession>;
  resume(tabId: number): Promise<RecordingSession>;
  stop(tabId: number): Promise<RecordingSession>;
  handleStopped(payload: StopRecordingPayload): Promise<void>;
  handleFailed(tabId: number, error: string): Promise<void>;
  handleTabRemoved(tabId: number): Promise<void>;
  handleTabUpdated(tabId: number, windowId?: number): Promise<void>;
}

interface CreateRecordingServiceOptions {
  onSessionChanged?: (session: RecordingSession) => void;
}

function createIdleSession(): RecordingSession {
  return { status: 'idle' };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function buildFileName(): string {
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value) => String(value).padStart(2, '0'))
    .join('');
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join('');
  return `quick-copy-recording_${date}_${time}.webm`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createRecordingService({ onSessionChanged }: CreateRecordingServiceOptions = {}): RecordingService {
  let session: RecordingSession = createIdleSession();
  const readyPromise = chrome.storage.session.get(RECORDING_SESSION_CACHE_KEY)
    .then((stored) => {
      const cached = stored[RECORDING_SESSION_CACHE_KEY] as RecordingSession | undefined;
      if (!cached || typeof cached !== 'object') {
        return;
      }

      session = cached;
    })
    .catch(() => undefined);

  async function persist(): Promise<void> {
    await chrome.storage.session.set({ [RECORDING_SESSION_CACHE_KEY]: session });
  }

  async function ensureContentScript(tabId: number): Promise<void> {
    const scriptFile = chrome.runtime.getManifest().content_scripts
      ?.flatMap((contentScript) => contentScript.js ?? [])
      .at(0);
    if (!scriptFile) {
      throw new Error('未找到页面录制控件脚本。');
    }

    await chrome.scripting.executeScript({ target: { tabId }, files: [scriptFile] });
  }

  async function notify(tabId: number): Promise<void> {
    const message = { type: 'quick-copy/recording-updated' as const, tabId, session };
    void chrome.runtime.sendMessage(message).catch(() => undefined);
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch {
      try {
        await ensureContentScript(tabId);
        await chrome.tabs.sendMessage(tabId, message);
      } catch {
        // 某些受限页面无法注入内容脚本，录制仍可由扩展图标 Badge 提示。
      }
    }
  }

  function setBadge(tabId: number, recording: boolean): void {
    void chrome.action.setBadgeBackgroundColor({ tabId, color: '#b42318' }).catch(() => undefined);
    void chrome.action.setBadgeText({ tabId, text: recording ? 'REC' : '' }).catch(() => undefined);
  }

  async function notifySession(): Promise<void> {
    const recording = session.status === 'recording' || session.status === 'paused';
    if (session.source === 'window' && typeof session.windowId === 'number') {
      const tabs = await chrome.tabs.query({ windowId: session.windowId });
      await Promise.all(tabs.flatMap((tab) => {
        if (typeof tab.id !== 'number') {
          return [];
        }
        setBadge(tab.id, recording);
        return [notify(tab.id)];
      }));
      return;
    }

    if (typeof session.tabId === 'number') {
      setBadge(session.tabId, recording);
      await notify(session.tabId);
    }
  }

  async function ensureOffscreenDocument(): Promise<void> {
    if (await chrome.offscreen.hasDocument()) {
      return;
    }

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.BLOBS],
      justification: '录制用户主动选择的当前标签页，并在停止后生成本地视频文件。',
    });
  }

  async function closeOffscreenDocument(): Promise<void> {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
  }

  async function sendOffscreenMessage(message: Record<string, unknown>): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage(message) as { ok?: boolean; error?: string } | undefined;
      if (!response?.ok) {
        throw new Error(response?.error || '录制器未就绪，请重试。');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, '录制器未就绪，请重试。'));
    }
  }

  async function update(next: RecordingSession, shouldNotify = true): Promise<void> {
    session = next;
    await persist();
    onSessionChanged?.(session);
    if (shouldNotify) {
      void notifySession().catch(() => undefined);
    }
  }

  async function isSessionAvailableInTab(tabId: number): Promise<boolean> {
    if (session.tabId === tabId) {
      return true;
    }
    if (session.source !== 'window' || typeof session.windowId !== 'number') {
      return false;
    }
    try {
      return (await chrome.tabs.get(tabId)).windowId === session.windowId;
    } catch {
      return false;
    }
  }

  async function releaseDownloadResources(blobUrl?: string): Promise<void> {
    try {
      if (blobUrl) {
        await chrome.runtime.sendMessage({
          type: 'quick-copy/offscreen-release-recording',
          blobUrl,
        });
      }
    } finally {
      await closeOffscreenDocument().catch(() => undefined);
    }
  }

  let settlingDownloadId: number | undefined;

  async function settleDownload(downloadId: number, state: 'complete' | 'interrupted', reason?: string): Promise<void> {
    await readyPromise;
    if (settlingDownloadId === downloadId || session.status !== 'saving' || session.downloadId !== downloadId) {
      return;
    }

    settlingDownloadId = downloadId;
    const blobUrl = session.downloadBlobUrl;
    try {
      if (state === 'complete') {
        await update({
          ...session,
          status: 'saved',
          downloadId,
          savedFileName: session.downloadFileName,
        });
      } else {
        await update({
          ...session,
          status: 'error',
          error: reason
            ? `录屏下载被中断（${reason}），请检查下载权限或磁盘空间后重试。`
            : '录屏下载被中断，请重试。',
        });
      }
    } finally {
      await releaseDownloadResources(blobUrl);
      settlingDownloadId = undefined;
    }
  }

  async function syncDownloadState(downloadId: number): Promise<void> {
    const [download] = await chrome.downloads.search({ id: downloadId });
    if (download?.state === 'complete' || download?.state === 'interrupted') {
      await settleDownload(downloadId, download.state, download.error);
    }
  }

  chrome.downloads.onChanged.addListener((delta) => {
    const state = delta.state?.current;
    if (state === 'complete' || state === 'interrupted') {
      void settleDownload(delta.id, state, delta.error?.current);
    }
  });

  // MV3 Worker 重启后主动补查，避免错过下载终态事件。
  void readyPromise.then(() => {
    if (session.status === 'saving' && typeof session.downloadId === 'number') {
      return syncDownloadState(session.downloadId);
    }
    return undefined;
  }).catch(() => undefined);

  return {
    async get(tabId) {
      await readyPromise;
      if (
        await isSessionAvailableInTab(tabId)
        && (session.status === 'recording' || session.status === 'paused')
        && session.source !== 'window'
      ) {
        const capturedTabs = await chrome.tabCapture.getCapturedTabs();
        const stillCaptured = capturedTabs.some(
          (capturedTab) => (
            capturedTab.tabId === tabId
            && (capturedTab.status === 'active' || capturedTab.status === 'pending')
          ),
        );
        if (!stillCaptured) {
          await update(createIdleSession(), false);
        }
      }
      return (await isSessionAvailableInTab(tabId)) ? session : createIdleSession();
    },
    async getLatest() {
      await readyPromise;
      return session;
    },
    async showHistory() {
      await readyPromise;
      const recordingSettings = await loadRecordingSettings();
      let downloadId = session.downloadId;
      if (typeof downloadId !== 'number') {
        const relativePath = session.savedFileName
          ? `${session.downloadDirectory ?? recordingSettings.downloadDirectory}/${session.savedFileName}`
          : undefined;
        const [matchedDownload] = await chrome.downloads.search({
          filenameRegex: relativePath
            ? `${escapeRegExp(relativePath)}$`
            : `${escapeRegExp(recordingSettings.downloadDirectory)}/.*\\.webm$`,
          orderBy: ['-startTime'],
        });
        if (!matchedDownload) {
          await chrome.downloads.showDefaultFolder();
          return;
        }
        downloadId = matchedDownload.id;
        await update({ ...session, downloadId }, false);
      }
      await chrome.downloads.show(downloadId);
    },
    async clearPreview() {
      await readyPromise;
      if (!session.recordingId) {
        return;
      }
      await update({ ...session, recordingId: undefined });
    },
    async start({ tabId, streamId, source = 'tab' }) {
      await readyPromise;
      if (session.status === 'recording' || session.status === 'paused' || session.status === 'saving') {
        throw new Error('已有标签页正在录制，请先停止当前录制。');
      }

      try {
        const recordingSettings = await loadRecordingSettings();
        const tab = await chrome.tabs.get(tabId);
        await ensureOffscreenDocument();
        await sendOffscreenMessage({
          type: 'quick-copy/offscreen-start-recording',
          tabId,
          streamId,
          fileName: buildFileName(),
          source,
        });
        await update({
          status: 'recording',
          tabId,
          windowId: tab.windowId,
          source,
          startedAt: Date.now(),
          elapsedMs: 0,
          downloadDirectory: recordingSettings.downloadDirectory,
        });
        return session;
      } catch (error) {
        await update({ status: 'error', tabId, error: getErrorMessage(error, '开始录制失败。') });
        throw error;
      }
    },
    async startFromContextMenu(tabId) {
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      return this.start({ tabId, streamId });
    },
    async startWindowFromContextMenu(tabId) {
      const url = chrome.runtime.getURL(`src/pages/recording-picker/index.html?tabId=${tabId}`);
      await chrome.windows.create({ url, type: 'popup', width: 360, height: 180, focused: true });
      return createIdleSession();
    },
    async startWindow(tabId) {
      await readyPromise;
      if (session.status === 'recording' || session.status === 'paused' || session.status === 'saving') {
        throw new Error('已有标签页正在录制，请先停止当前录制。');
      }

      const [recordingSettings, tab] = await Promise.all([loadRecordingSettings(), chrome.tabs.get(tabId)]);
      await update({
        status: 'recording',
        tabId,
        windowId: tab.windowId,
        source: 'window',
        startedAt: Date.now(),
        elapsedMs: 0,
        downloadDirectory: recordingSettings.downloadDirectory,
      });
      return session;
    },
    async pause(tabId) {
      await readyPromise;
      if (!(await isSessionAvailableInTab(tabId)) || session.status !== 'recording' || !session.startedAt) {
        throw new Error('当前标签页没有可暂停的录制。');
      }
      const recordingTabId = session.tabId;
      if (typeof recordingTabId !== 'number') {
        throw new Error('录制会话缺少源标签页。');
      }

      await sendOffscreenMessage({ type: 'quick-copy/offscreen-pause-recording', tabId: recordingTabId });
      await update({
        ...session,
        status: 'paused',
        elapsedMs: Math.max(0, Date.now() - session.startedAt),
      });
      return session;
    },
    async resume(tabId) {
      await readyPromise;
      if (!(await isSessionAvailableInTab(tabId)) || session.status !== 'paused') {
        throw new Error('当前标签页没有已暂停的录制。');
      }
      const recordingTabId = session.tabId;
      if (typeof recordingTabId !== 'number') {
        throw new Error('录制会话缺少源标签页。');
      }

      await sendOffscreenMessage({ type: 'quick-copy/offscreen-resume-recording', tabId: recordingTabId });
      const elapsedMs = session.elapsedMs ?? 0;
      await update({
        ...session,
        status: 'recording',
        elapsedMs,
        startedAt: Date.now() - elapsedMs,
      });
      return session;
    },
    async stop(tabId) {
      await readyPromise;
      if (!(await isSessionAvailableInTab(tabId)) || (session.status !== 'recording' && session.status !== 'paused')) {
        throw new Error('当前标签页没有正在进行的录制。');
      }
      const recordingTabId = session.tabId;
      if (typeof recordingTabId !== 'number') {
        throw new Error('录制会话缺少源标签页。');
      }

      const elapsedMs = session.status === 'recording' && session.startedAt
        ? Math.max(0, Date.now() - session.startedAt)
        : session.elapsedMs ?? 0;
      await update({ ...session, status: 'saving', elapsedMs });
      try {
        await sendOffscreenMessage({ type: 'quick-copy/offscreen-stop-recording', tabId: recordingTabId });
      } catch (error) {
        await update({
          ...session,
          status: 'error',
          error: getErrorMessage(error, '停止录制失败。'),
        });
        throw error;
      }
      return session;
    },
    async handleStopped({ tabId, blobUrl, fileName, recordingId }) {
      await readyPromise;
      if (session.tabId !== tabId) {
        return;
      }

      try {
        const downloadFileName = buildRecordingDownloadFileName(session.downloadDirectory ?? '', fileName);
        const downloadId = await chrome.downloads.download({ url: blobUrl, filename: downloadFileName, saveAs: false });
        await update({
          ...session,
          status: 'saving',
          tabId,
          downloadBlobUrl: blobUrl,
          downloadFileName: fileName,
          downloadId,
          downloadDirectory: session.downloadDirectory,
          recordingId,
        });
        await syncDownloadState(downloadId);
      } catch (error) {
        await update({ ...session, status: 'error', error: getErrorMessage(error, '保存录屏失败。') });
        await releaseDownloadResources(blobUrl);
      }
    },
    async handleFailed(tabId, error) {
      await readyPromise;
      if (session.tabId !== tabId) {
        return;
      }
      const blobUrl = session.downloadBlobUrl;
      await update({ ...session, status: 'error', error });
      await releaseDownloadResources(blobUrl);
    },
    async handleTabRemoved(tabId) {
      await readyPromise;
      if (
        session.tabId !== tabId
        || (session.status !== 'recording' && session.status !== 'paused')
      ) {
        return;
      }

      if (session.source === 'window') {
        return;
      }

      try {
        await sendOffscreenMessage({ type: 'quick-copy/offscreen-stop-recording', tabId });
      } catch {
        await update(createIdleSession(), false);
      }
    },
    async handleTabUpdated(tabId, windowId) {
      await readyPromise;
      if (
        session.source === 'window'
        && session.windowId === windowId
        && (session.status === 'recording' || session.status === 'paused')
      ) {
        setBadge(tabId, true);
        void notify(tabId);
      }
    },
  };
}
