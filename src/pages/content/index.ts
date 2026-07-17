import type {
  CapturedPageErrorPayload,
  CapturedResponsePayload,
  ReportPageErrorResponse,
} from '@src/lib/quick-copy';

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
  style.textContent = `
    :host { all: initial; }
    .notice { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; width: min(360px, calc(100vw - 32px)); box-sizing: border-box; padding: 16px; border: 1px solid #d7d2cb; border-left: 4px solid #b42318; border-radius: 8px; background: #fffdfa; box-shadow: 0 16px 38px rgba(31, 37, 32, .2); color: #1f2520; font-family: "Segoe UI", "PingFang SC", sans-serif; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    strong { display: block; font-size: 14px; line-height: 1.4; }
    p { margin: 6px 0 0; color: #625f5a; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
    .close { width: 28px; height: 28px; flex: 0 0 28px; padding: 0; border: 0; background: transparent; color: #625f5a; font-size: 20px; line-height: 1; cursor: pointer; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
    .action { min-height: 34px; padding: 7px 12px; border: 1px solid #8f3416; border-radius: 6px; font: 600 12px/1.4 "Segoe UI", "PingFang SC", sans-serif; cursor: pointer; }
    .copy { background: #8f3416; color: #fff; }
    .details { background: #fff; color: #8f3416; }
    .status { color: #28724f; font-size: 12px; line-height: 1.4; }
    .brand { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e8e3dc; color: #625f5a; font-size: 11px; line-height: 1.4; }
    .brand img { display: block; width: 16px; height: 16px; object-fit: contain; }
    button:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
  `;
  const notice = document.createElement('aside');
  notice.className = 'notice';
  notice.setAttribute('role', 'alert');

  const head = document.createElement('div');
  head.className = 'head';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = '检测到页面运行异常';
  const description = document.createElement('p');
  description.textContent = error.message;
  copy.append(title, description);

  const closeButton = document.createElement('button');
  closeButton.className = 'close';
  closeButton.type = 'button';
  closeButton.title = '关闭提示';
  closeButton.setAttribute('aria-label', '关闭提示');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => host.remove());
  head.append(copy, closeButton);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const copyButton = document.createElement('button');
  copyButton.className = 'action copy';
  copyButton.type = 'button';
  copyButton.textContent = '复制错误信息';
  const status = document.createElement('span');
  status.className = 'status';
  copyButton.addEventListener('click', () => {
    void copyText(buildPageErrorClipboardText(error)).then(() => {
      status.textContent = '已复制，可发给开发人员';
    });
  });
  const detailsButton = document.createElement('button');
  detailsButton.className = 'action details';
  detailsButton.type = 'button';
  detailsButton.textContent = '查看详情';
  detailsButton.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'quick-copy/open-popup' }).then((response) => {
      if (!response?.ok) {
        status.textContent = response?.error || '请点击扩展图标查看详情';
      }
    }).catch(() => {
      status.textContent = '请点击扩展图标查看详情';
    });
  });
  actions.append(copyButton, detailsButton, status);
  const brand = document.createElement('div');
  brand.className = 'brand';
  const brandIcon = document.createElement('img');
  brandIcon.src = chrome.runtime.getURL('icon-32.png');
  brandIcon.alt = '';
  const brandText = document.createElement('span');
  brandText.textContent = 'Quick Copy Ext 插件';
  brand.append(brandIcon, brandText);
  notice.append(head, actions, brand);
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
