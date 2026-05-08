interface CopyBugButtonRule {
  id: string;
  name: string;
  pageUrlPattern: RegExp;
  modalClassNames: string[];
  markdownFieldId: string;
}

interface ManagedModalState {
  modal: HTMLElement;
  button: HTMLButtonElement;
  cleanupPositionStyle: boolean;
}

const COPY_BUG_BUTTON_WRAPPER_ATTR = 'data-quick-copy-bug-button-wrapper';
const COPY_BUG_BUTTON_ATTR = 'data-quick-copy-bug-button';
const COPY_BUG_BUTTON_MODAL_ATTR = 'data-quick-copy-bug-button-modal';
const COPY_BUG_BUTTON_MODAL_ID_ATTR = 'data-quick-copy-bug-button-modal-id';
const TOAST_ATTR = 'data-quick-copy-bug-button-toast';
const TOAST_VISIBLE_CLASS = 'quick-copy-bug-button-toast--visible';
const DEFAULT_BUTTON_TEXT = '复制 Markdown 链接';
const MODAL_SELECTOR =
  '.J-card-edit-modal-body.bitable-hover-scrollbar-sm-no-shift.J-card-edit-modal-body--padding-standard';
const INTERACTION_SCAN_DURATION = 2500;
const INTERACTION_SCAN_INTERVAL = 250;
const INTERACTION_SCAN_SETTLE_DELAY = 120;

const copyBugButtonRules: CopyBugButtonRule[] = [
  {
    id: 'supermonkey-feishu-bug-record',
    name: 'Supermonkey 飞书 Bug 记录',
    pageUrlPattern: /^https:\/\/supermonkey\.feishu\.cn\/wiki\//,
    modalClassNames: [
      'J-card-edit-modal-body',
      'bitable-hover-scrollbar-sm-no-shift',
      'J-card-edit-modal-body--padding-standard',
    ],
    markdownFieldId: 'fld0c084Bv',
  },
];

const managedModals = new Map<string, ManagedModalState>();
let toastTimer: number | null = null;
let modalInstanceId = 0;
let interactionSettleTimer: number | null = null;
let pollingTimer: number | null = null;
let pollingStopTimer: number | null = null;

function shouldEnableCopyBugButton() {
  return copyBugButtonRules.some((rule) => rule.pageUrlPattern.test(window.location.href));
}

function getManagedModalKey(ruleId: string, modal: HTMLElement) {
  let modalId = modal.getAttribute(COPY_BUG_BUTTON_MODAL_ID_ATTR);

  if (!modalId) {
    modalInstanceId += 1;
    modalId = `${ruleId}-${modalInstanceId}`;
    modal.setAttribute(COPY_BUG_BUTTON_MODAL_ID_ATTR, modalId);
  }

  return `${ruleId}::${modalId}`;
}

function queryRuleModals(rule: CopyBugButtonRule) {
  return Array.from(document.querySelectorAll<HTMLElement>(MODAL_SELECTOR)).filter((element) =>
    rule.modalClassNames.every((className) => element.classList.contains(className)),
  );
}

function normalizeMarkdownLink(rawText: string | null | undefined) {
  if (!rawText) {
    return '';
  }

  return rawText.trim();
}

function getMarkdownFieldText(modal: HTMLElement, rule: CopyBugButtonRule) {
  const selector = `[data-field-id="${rule.markdownFieldId}"] .formula_editor_value_wraper_text`;
  const fieldTextElement = modal.querySelector<HTMLElement>(selector);
  return normalizeMarkdownLink(fieldTextElement?.textContent);
}

function getCopyText(modal: HTMLElement, rule: CopyBugButtonRule) {
  return getMarkdownFieldText(modal, rule);
}

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.focus();
  input.select();
  document.execCommand('copy');
  input.remove();
}

function getToastElement() {
  let toast = document.querySelector<HTMLElement>(`[${TOAST_ATTR}]`);

  if (!toast) {
    toast = document.createElement('div');
    toast.setAttribute(TOAST_ATTR, 'true');
    toast.className = 'quick-copy-bug-button-toast';
    document.body.appendChild(toast);
  }

  return toast;
}

function showToast(message: string, isError = false) {
  const toast = getToastElement();
  toast.textContent = message;
  toast.dataset.type = isError ? 'error' : 'success';
  toast.classList.add(TOAST_VISIBLE_CLASS);

  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast?.classList.remove(TOAST_VISIBLE_CLASS);
    toastTimer = null;
  }, 1800);
}

function updateButtonState(state: ManagedModalState, rule: CopyBugButtonRule) {
  const copyText = getCopyText(state.modal, rule);
  state.button.disabled = !copyText;
  state.button.textContent = copyText ? DEFAULT_BUTTON_TEXT : '未找到 Markdown 链接';
  state.button.title = copyText ? '复制当前记录的 Markdown 链接' : '当前弹窗内未找到目标 Markdown 字段';
}

async function handleCopyClick(state: ManagedModalState, rule: CopyBugButtonRule) {
  const copyText = getCopyText(state.modal, rule);

  if (!copyText) {
    updateButtonState(state, rule);
    showToast('当前弹窗内未找到可复制的 Markdown 链接。', true);
    return;
  }

  const originalText = state.button.textContent;
  state.button.disabled = true;
  state.button.textContent = '复制中...';

  try {
    await writeToClipboard(copyText);
    showToast(`已复制：${copyText}`);
    state.button.textContent = '已复制';
    window.setTimeout(() => {
      state.button.textContent = DEFAULT_BUTTON_TEXT;
      updateButtonState(state, rule);
    }, 1200);
  } catch (error) {
    console.error('[Quick Copy Ext] failed to copy markdown link', error);
    state.button.textContent = originalText ?? DEFAULT_BUTTON_TEXT;
    updateButtonState(state, rule);
    showToast('复制失败，请检查页面权限后重试。', true);
  }
}

function createButton(rule: CopyBugButtonRule, modal: HTMLElement) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute(COPY_BUG_BUTTON_WRAPPER_ATTR, rule.id);
  wrapper.className = 'quick-copy-bug-button-wrapper';

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute(COPY_BUG_BUTTON_ATTR, rule.id);
  button.className = 'quick-copy-bug-button';
  button.textContent = DEFAULT_BUTTON_TEXT;

  wrapper.appendChild(button);
  modal.appendChild(wrapper);

  let cleanupPositionStyle = false;
  if (window.getComputedStyle(modal).position === 'static') {
    modal.style.position = 'relative';
    cleanupPositionStyle = true;
  }

  modal.setAttribute(COPY_BUG_BUTTON_MODAL_ATTR, 'true');

  const state: ManagedModalState = {
    modal,
    button,
    cleanupPositionStyle,
  };

  button.addEventListener('click', () => {
    void handleCopyClick(state, rule);
  });

  updateButtonState(state, rule);
  return state;
}

function syncRule(rule: CopyBugButtonRule) {
  const liveKeys = new Set<string>();

  queryRuleModals(rule).forEach((modal) => {
    const key = getManagedModalKey(rule.id, modal);
    liveKeys.add(key);

    const existing = managedModals.get(key);
    if (existing) {
      updateButtonState(existing, rule);
      return;
    }

    const state = createButton(rule, modal);
    managedModals.set(key, state);
  });

  Array.from(managedModals.entries()).forEach(([key, state]) => {
    if (!key.startsWith(`${rule.id}::`) || liveKeys.has(key)) {
      return;
    }

    if (state.cleanupPositionStyle) {
      state.modal.style.position = '';
    }

    state.modal.removeAttribute(COPY_BUG_BUTTON_MODAL_ATTR);
    state.modal.removeAttribute(COPY_BUG_BUTTON_MODAL_ID_ATTR);
    state.button.closest(`[${COPY_BUG_BUTTON_WRAPPER_ATTR}]`)?.remove();
    managedModals.delete(key);
  });
}

function syncAllRules() {
  copyBugButtonRules.forEach(syncRule);
}

function stopPolling() {
  if (pollingTimer !== null) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }

  if (pollingStopTimer !== null) {
    window.clearTimeout(pollingStopTimer);
    pollingStopTimer = null;
  }
}

function triggerInteractionScan() {
  if (!document.body) {
    return;
  }

  stopPolling();
  syncAllRules();

  pollingTimer = window.setInterval(() => {
    syncAllRules();
  }, INTERACTION_SCAN_INTERVAL);

  pollingStopTimer = window.setTimeout(() => {
    stopPolling();
  }, INTERACTION_SCAN_DURATION);
}

function scheduleInteractionScan() {
  if (interactionSettleTimer !== null) {
    window.clearTimeout(interactionSettleTimer);
  }

  interactionSettleTimer = window.setTimeout(() => {
    interactionSettleTimer = null;
    triggerInteractionScan();
  }, INTERACTION_SCAN_SETTLE_DELAY);
}

function handleDocumentClick(event: Event) {
  if (!shouldEnableCopyBugButton()) {
    return;
  }

  if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  scheduleInteractionScan();
}

function initCopyBugButton() {
  if (!shouldEnableCopyBugButton()) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        document.addEventListener('click', handleDocumentClick, true);
      },
      { once: true },
    );
    return;
  }

  document.addEventListener('click', handleDocumentClick, true);
}

try {
  initCopyBugButton();
  console.debug('[Quick Copy Ext] content script ready');
} catch (error) {
  console.error('[Quick Copy Ext] content script failed to initialize', error);
}
