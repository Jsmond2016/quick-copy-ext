import type { CapturedResponsePayload } from '@src/lib/quick-copy';

const INJECTED_SCRIPT_ID = 'quick-copy-ext-network-hook';
const PAGE_MESSAGE_SOURCE = 'quick-copy-ext-page-hook';

interface PageHookMessage {
  source: string;
  type: 'quick-copy:response';
  payload: CapturedResponsePayload;
}

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

window.addEventListener('message', (event: MessageEvent<PageHookMessage>) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  if (!message || message.source !== PAGE_MESSAGE_SOURCE || message.type !== 'quick-copy:response') {
    return;
  }

  void chrome.runtime.sendMessage({
    type: 'quick-copy/report-response-body',
    payload: message.payload,
  });
});

try {
  injectPageHook();
  console.debug('[Quick Copy Ext] content script ready');
} catch (error) {
  console.error('[Quick Copy Ext] content script failed to initialize', error);
}
