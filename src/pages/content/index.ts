import type {
  CapturedPageErrorPayload,
  CapturedResponsePayload,
  ReportPageErrorResponse,
} from '@src/lib/quick-copy';
import errorNoticeStyles from './error-notice.css?inline';

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
const OPEN_POPUP_FALLBACK = '请点击扩展图标查看详情';
let errorNoticeShown = false;

function injectPageHook() {
  if (document.getElementById(INJECTED_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = INJECTED_SCRIPT_ID;
  script.src = chrome.runtime.getURL('page-network-hook.js');
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
  icon.src = chrome.runtime.getURL('icon-32.png');
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
  messageContent.append(title, description);

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
    void chrome.runtime.sendMessage({ type: 'quick-copy/open-popup' }).then((response) => {
      if (!response?.ok) {
        status.textContent = response?.error || OPEN_POPUP_FALLBACK;
      }
    }).catch(() => {
      status.textContent = OPEN_POPUP_FALLBACK;
    });
  });
  actions.append(copyButton, detailsButton, status);
  notice.append(head, actions, createExtensionBrand());
  shadow.append(style, notice);
  document.documentElement.appendChild(host);
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
    void chrome.runtime.sendMessage({
      type: 'quick-copy/report-response-body',
      payload: message.payload,
    });
    return;
  }

  if (message.type === 'quick-copy:page-error') {
    void chrome.runtime.sendMessage({
      type: 'quick-copy/report-page-error',
      payload: message.payload,
    }).then((response: ReportPageErrorResponse) => {
      if (response.ok && response.data.accepted) {
        showPageErrorNotice(message.payload);
      }
    }).catch(() => undefined);
  }
});

try {
  void chrome.runtime.sendMessage({ type: 'quick-copy/page-session-started' });
  injectPageHook();
  console.debug('[Quick Copy Ext] content script ready');
} catch (error) {
  console.error('[Quick Copy Ext] content script failed to initialize', error);
}
