import type {
  CapturedPageErrorPayload,
  CapturedResponsePayload,
  PageMonitoringStateResponse,
  RecordingSession,
  RecordingSessionResponse,
  ReportPageErrorResponse,
  RuntimeEventMessage,
  RuntimeRequestMessage,
} from '@src/lib/quick-copy';
import errorNoticeStyles from './error-notice.css?inline';
import recordingOverlayStyles from './recording-overlay.css?inline';
import { closeScreenshotEditor, openScreenshotEditor } from './screenshot-editor';

const INJECTED_SCRIPT_ID = 'quick-copy-ext-network-hook';
const PAGE_MESSAGE_SOURCE = 'quick-copy-ext-page-hook';

interface ResponseHookMessage {
  source: string;
  type: 'quick-copy:response';
  payload: CapturedResponsePayload;
}

interface ErrorHookMessage {
  source: string;
  type: 'quick-copy:page-error';
  payload: CapturedPageErrorPayload;
}

type PageHookMessage = ResponseHookMessage | ErrorHookMessage;

const ERROR_NOTICE_ID = 'quick-copy-ext-error-notice';
const RECORDING_OVERLAY_ID = 'quick-copy-ext-recording-overlay';
const OPEN_POPUP_FALLBACK = '请点击扩展图标查看详情';
let errorNoticeShown = false;
let recordingOverlay: HTMLDivElement | undefined;
let recordingTimer: number | undefined;
const RECORDING_OVERLAY_POSITION_PREFIX = 'quick-copy-recording-overlay-position:';
const STOP_RECORDING_HOLD_MS = 1_300;

interface RecordingOverlayPosition {
  left: number;
  top: number;
}

function isExtensionContextInvalidated(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Extension context invalidated');
}

async function sendRuntimeMessage<T>(message: RuntimeRequestMessage): Promise<T | undefined> {
  try {
    return await chrome.runtime.sendMessage(message) as T;
  } catch (error) {
    if (!isExtensionContextInvalidated(error)) {
      console.error('[Quick Copy Ext] runtime message failed', error);
    }
    return undefined;
  }
}

function getExtensionUrl(path: string): string | undefined {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    if (!isExtensionContextInvalidated(error)) {
      console.error('[Quick Copy Ext] extension URL unavailable', error);
    }
    return undefined;
  }
}

function injectPageHook() {
  if (document.getElementById(INJECTED_SCRIPT_ID)) {
    return;
  }

  const hookUrl = getExtensionUrl('page-network-hook.js');
  if (!hookUrl) {
    return;
  }

  const script = document.createElement('script');
  script.id = INJECTED_SCRIPT_ID;
  script.src = hookUrl;
  script.async = false;
  (document.documentElement || document.head).appendChild(script);
  script.remove();
}

function buildPageErrorClipboardText(error: CapturedPageErrorPayload): string {
  const location = error.filename
    ? `${error.filename}${error.lineNumber ? `:${error.lineNumber}` : ''}${error.columnNumber ? `:${error.columnNumber}` : ''}`
    : error.resourceUrl ?? '-';
  const lines = [
    '=== 页面异常信息',
    '',
    `- 页面 URL：${error.pageUrl || window.location.href}`,
    `- 发生时间：${new Date(error.occurredAt).toLocaleString('zh-CN', { hour12: false })}`,
    `- 错误信息：${error.message}`,
    `- 错误位置：${location}`,
  ];

  if (error.stack) {
    lines.push('', '错误堆栈：', error.stack);
  }

  lines.push('', '=== From Quick Copy Ext');
  return lines.join('\n');
}

function createButton(className: string, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = text;
  return button;
}

function createExtensionBrand(): HTMLDivElement {
  const brand = document.createElement('div');
  brand.className = 'brand';

  const icon = document.createElement('img');
  const iconUrl = getExtensionUrl('icon-32.png');
  if (iconUrl) {
    icon.src = iconUrl;
  }
  icon.alt = '';

  const text = document.createElement('span');
  text.textContent = 'Quick Copy Ext 插件';
  brand.append(icon, text);
  return brand;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.documentElement.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) {
      throw new Error('复制失败。');
    }
  }
}

function showPageErrorNotice(error: CapturedPageErrorPayload): void {
  if (errorNoticeShown || document.getElementById(ERROR_NOTICE_ID)) {
    return;
  }

  errorNoticeShown = true;
  const host = document.createElement('div');
  host.id = ERROR_NOTICE_ID;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = errorNoticeStyles;
  const notice = document.createElement('aside');
  notice.className = 'notice';
  notice.setAttribute('role', 'alert');

  const head = document.createElement('div');
  head.className = 'head';
  const messageContent = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = '检测到页面运行异常';
  const description = document.createElement('p');
  description.textContent = error.message;
  const settingsHint = document.createElement('p');
  settingsHint.textContent = '可在设置-是否开启页面错误捕捉中关闭';
  messageContent.append(title, description, settingsHint);

  const closeButton = createButton('close', '×');
  closeButton.title = '关闭提示';
  closeButton.setAttribute('aria-label', '关闭提示');
  closeButton.addEventListener('click', () => host.remove());
  head.append(messageContent, closeButton);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const copyButton = createButton('action copy', '复制错误信息');
  const status = document.createElement('span');
  status.className = 'status';
  copyButton.addEventListener('click', () => {
    void copyText(buildPageErrorClipboardText(error)).then(() => {
      status.textContent = '已复制，可发给开发人员';
    });
  });
  const detailsButton = createButton('action details', '查看详情');
  detailsButton.addEventListener('click', () => {
    void sendRuntimeMessage<{ ok: boolean; error?: string }>({ type: 'quick-copy/open-popup' }).then((response) => {
      if (!response?.ok) {
        status.textContent = response?.error || OPEN_POPUP_FALLBACK;
      }
    });
  });
  actions.append(copyButton, detailsButton, status);
  notice.append(head, actions, createExtensionBrand());
  shadow.append(style, notice);
  document.documentElement.appendChild(host);
}

function formatRecordingDuration(session: RecordingSession): string {
  const elapsedMs = session.status === 'recording' && session.startedAt
    ? Math.max(0, Date.now() - session.startedAt)
    : session.elapsedMs ?? 0;
  const seconds = Math.floor(elapsedMs / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function removeRecordingOverlay(): void {
  if (recordingTimer !== undefined) {
    window.clearInterval(recordingTimer);
    recordingTimer = undefined;
  }
  recordingOverlay?.remove();
  recordingOverlay = undefined;
}

function getRecordingOverlayPositionKey(): string {
  return `${RECORDING_OVERLAY_POSITION_PREFIX}${window.location.origin}`;
}

function clampOverlayPosition(overlay: HTMLElement, position: RecordingOverlayPosition): RecordingOverlayPosition {
  const margin = 8;
  return {
    left: Math.min(Math.max(margin, position.left), Math.max(margin, window.innerWidth - overlay.offsetWidth - margin)),
    top: Math.min(Math.max(margin, position.top), Math.max(margin, window.innerHeight - overlay.offsetHeight - margin)),
  };
}

function applyOverlayPosition(overlay: HTMLElement, position: RecordingOverlayPosition): void {
  const nextPosition = clampOverlayPosition(overlay, position);
  overlay.style.left = `${nextPosition.left}px`;
  overlay.style.top = `${nextPosition.top}px`;
  overlay.style.right = 'auto';
  overlay.style.bottom = 'auto';
}

async function restoreOverlayPosition(overlay: HTMLElement): Promise<void> {
  const key = getRecordingOverlayPositionKey();
  const stored = await chrome.storage.local.get(key);
  const position = stored[key] as RecordingOverlayPosition | undefined;
  if (
    position
    && typeof position.left === 'number'
    && typeof position.top === 'number'
  ) {
    applyOverlayPosition(overlay, position);
  }
}

function enableOverlayDrag(overlay: HTMLElement, handle: HTMLElement): void {
  let activePointerId: number | undefined;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    const rect = overlay.getBoundingClientRect();
    applyOverlayPosition(overlay, { left: rect.left, top: rect.top });
    activePointerId = event.pointerId;
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
    overlay.classList.add('dragging');
    event.preventDefault();
  });

  handle.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    applyOverlayPosition(overlay, { left: event.clientX - offsetX, top: event.clientY - offsetY });
  });

  const finishDrag = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    activePointerId = undefined;
    overlay.classList.remove('dragging');
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    const rect = overlay.getBoundingClientRect();
    const position = clampOverlayPosition(overlay, { left: rect.left, top: rect.top });
    applyOverlayPosition(overlay, position);
    void chrome.storage.local.set({ [getRecordingOverlayPositionKey()]: position });
  };

  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', finishDrag);
}

function enableRecordingControl(button: HTMLButtonElement, session: RecordingSession): void {
  if (typeof session.tabId !== 'number') {
    return;
  }
  const activeTabId: number = session.tabId;

  let holdTimer: number | undefined;
  let progressTimer: number | undefined;
  let recordingStopped = false;
  const isPaused = session.status === 'paused';
  const controlIcon = document.createElement('span');
  controlIcon.className = `control-icon ${isPaused ? 'play' : 'pause'}`;
  button.replaceChildren(controlIcon);

  function clearHoldState(): void {
    if (holdTimer !== undefined) {
      window.clearTimeout(holdTimer);
      holdTimer = undefined;
    }
    if (progressTimer !== undefined) {
      window.clearInterval(progressTimer);
      progressTimer = undefined;
    }
    button.classList.remove('holding');
    button.style.removeProperty('--hold-progress');
  }

  function updateHoldProgress(startedAt: number): void {
    const progress = Math.min(1, (Date.now() - startedAt) / STOP_RECORDING_HOLD_MS);
    button.style.setProperty('--hold-progress', `${Math.round(progress * 360)}deg`);
  }

  function togglePause(): void {
    if (button.disabled || recordingStopped) {
      return;
    }
    button.disabled = true;
    void sendRuntimeMessage({
      type: session.status === 'paused' ? 'quick-copy/resume-recording' : 'quick-copy/pause-recording',
      tabId: activeTabId,
    }).finally(() => {
      button.disabled = false;
    });
  }

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || button.disabled) {
      return;
    }
    recordingStopped = false;
    const startedAt = Date.now();
    button.setPointerCapture(event.pointerId);
    button.classList.add('holding');
    updateHoldProgress(startedAt);
    progressTimer = window.setInterval(() => updateHoldProgress(startedAt), 32);
    holdTimer = window.setTimeout(() => {
      recordingStopped = true;
      clearHoldState();
      button.disabled = true;
      void sendRuntimeMessage({ type: 'quick-copy/stop-recording', tabId: activeTabId });
    }, STOP_RECORDING_HOLD_MS);
  });

  button.addEventListener('pointerup', (event) => {
    const shouldToggle = holdTimer !== undefined && !recordingStopped;
    clearHoldState();
    if (button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
    if (shouldToggle) {
      togglePause();
    }
  });
  button.addEventListener('pointercancel', clearHoldState);
  button.addEventListener('click', (event) => {
    if (event.detail === 0) {
      togglePause();
    }
  });
}

function showRecordingOverlay(session: RecordingSession): void {
  if (session.status !== 'recording' && session.status !== 'paused' && session.status !== 'saving') {
    removeRecordingOverlay();
    return;
  }

  removeRecordingOverlay();
  const host = document.createElement('div');
  host.id = RECORDING_OVERLAY_ID;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = recordingOverlayStyles;
  const overlay = document.createElement('aside');
  overlay.className = `overlay ${session.status}`;
  overlay.setAttribute('aria-label', '录制控制');

  const signal = document.createElement('span');
  signal.className = 'signal';
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  const info = document.createElement('div');
  info.className = 'info';
  const status = document.createElement('span');
  status.className = 'status';
  status.textContent = session.status === 'paused'
    ? '录制已暂停'
    : session.status === 'saving'
      ? '录制已结束，等待浏览器完成保存'
      : '正在录制';
  const timer = document.createElement('strong');
  timer.className = 'timer';
  timer.textContent = formatRecordingDuration(session);
  info.append(status, timer);
  dragHandle.append(signal, info);

  if (session.status !== 'saving' && typeof session.tabId === 'number') {
    const controlButton = createButton('recording-control', '');
    controlButton.title = session.status === 'paused'
      ? '点击继续录制；按住 1.3 秒结束并保存'
      : '点击暂停录制；按住 1.3 秒结束并保存';
    controlButton.setAttribute('aria-label', controlButton.title);
    enableRecordingControl(controlButton, session);
    overlay.append(dragHandle, controlButton);
  } else {
    overlay.append(dragHandle);
  }
  shadow.append(style, overlay);
  document.documentElement.appendChild(host);
  recordingOverlay = host;
  enableOverlayDrag(overlay, dragHandle);
  void restoreOverlayPosition(overlay).catch(() => undefined);
  if (session.status === 'recording') {
    recordingTimer = window.setInterval(() => {
      timer.textContent = formatRecordingDuration(session);
    }, 1_000);
  }
}

window.addEventListener('message', (event: MessageEvent<PageHookMessage>) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  if (!message || message.source !== PAGE_MESSAGE_SOURCE) {
    return;
  }

  if (message.type === 'quick-copy:response') {
    void sendRuntimeMessage({
      type: 'quick-copy/report-response-body',
      payload: message.payload,
    });
    return;
  }

  if (message.type === 'quick-copy:page-error') {
    void sendRuntimeMessage<ReportPageErrorResponse>({
      type: 'quick-copy/report-page-error',
      payload: message.payload,
    }).then((response) => {
      if (response?.ok && response.data.accepted) {
        showPageErrorNotice(message.payload);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeEventMessage | RuntimeRequestMessage) => {
  if (message.type === 'quick-copy/recording-updated') {
    showRecordingOverlay(message.session);
    return;
  }
  if (message.type === 'quick-copy/open-screenshot-editor') {
    openScreenshotEditor(message.sessionId, message.imageDataUrl);
    return;
  }
  if (message.type === 'quick-copy/close-screenshot-editor') {
    closeScreenshotEditor(message.sessionId);
  }
});

async function initializePageSession(): Promise<void> {
  const response = await sendRuntimeMessage<PageMonitoringStateResponse>({
    type: 'quick-copy/get-page-monitoring-state',
  });

  if (response?.ok && response.data.enabled) {
    void sendRuntimeMessage({ type: 'quick-copy/page-session-started' });
    injectPageHook();
    console.debug('[Quick Copy Ext] content script ready');
  }

  const recordingResponse = await sendRuntimeMessage<RecordingSessionResponse>({
    type: 'quick-copy/get-current-tab-recording-session',
  });
  if (recordingResponse?.ok) {
    showRecordingOverlay(recordingResponse.data);
  }
}

void initializePageSession().catch((error: unknown) => {
  console.error('[Quick Copy Ext] content script failed to initialize', error);
});
