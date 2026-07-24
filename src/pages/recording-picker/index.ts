import { saveRecordingPreview, type RecordingSessionResponse } from '@src/lib/quick-copy';
import './index.css';

interface ActiveRecording {
  chunks: Blob[];
  recorder: MediaRecorder;
  stream: MediaStream;
}

const MAX_RECORDING_MS = 5 * 60 * 1_000;
const startButton = document.querySelector<HTMLButtonElement>('#start');
const message = document.querySelector<HTMLParagraphElement>('#message');
const tabId = Number(new URLSearchParams(window.location.search).get('tabId'));
let activeRecording: ActiveRecording | null = null;
let maxDurationTimer: number | undefined;

function setMessage(value: string): void {
  if (message) {
    message.textContent = value;
  }
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

function getRecorderOptions(): MediaRecorderOptions | undefined {
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = mimeTypes.find((value) => MediaRecorder.isTypeSupported(value));
  return mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 };
}

function clearMaxDurationTimer(): void {
  if (maxDurationTimer !== undefined) {
    window.clearTimeout(maxDurationTimer);
    maxDurationTimer = undefined;
  }
}

function stopRecording(): void {
  const recording = activeRecording;
  if (recording && recording.recorder.state !== 'inactive') {
    recording.recorder.stop();
  }
}

function chooseWindowStream(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(['window'], (streamId) => {
      if (!streamId) {
        reject(new Error('未选择录制窗口。'));
        return;
      }
      resolve(streamId);
    });
  });
}

async function createWindowStream(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 24,
      },
    },
  } as MediaStreamConstraints);
}

function reportFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : '录制过程中发生未知错误。';
  void chrome.runtime.sendMessage({ type: 'quick-copy/offscreen-recording-failed', tabId, error: message });
}

async function focusRecordingWindow(): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  if (typeof tab.id === 'number') {
    await chrome.tabs.update(tab.id, { active: true });
  }
}

function startRecording(stream: MediaStream): void {
  const recorder = new MediaRecorder(stream, getRecorderOptions());
  const recording: ActiveRecording = { chunks: [], recorder, stream };
  activeRecording = recording;

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      recording.chunks.push(event.data);
    }
  });
  recorder.addEventListener('error', () => reportFailure(new Error('浏览器录制器异常终止。')));
  recorder.addEventListener('stop', () => {
    clearMaxDurationTimer();
    recording.stream.getTracks().forEach((track) => track.stop());
    activeRecording = null;
    if (recording.chunks.length === 0) {
      reportFailure(new Error('未生成有效的录屏内容。'));
      return;
    }

    const blob = new Blob(recording.chunks, { type: recorder.mimeType || 'video/webm' });
    const blobUrl = URL.createObjectURL(blob);
    const recordingId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    void saveRecordingPreview(recordingId, blob)
      .then(() => chrome.runtime.sendMessage({
        type: 'quick-copy/offscreen-recording-stopped',
        tabId,
        blobUrl,
        fileName: buildFileName(),
        recordingId,
      }))
      .catch(() => chrome.runtime.sendMessage({
        type: 'quick-copy/offscreen-recording-stopped',
        tabId,
        blobUrl,
        fileName: buildFileName(),
      }));
  });
  stream.getVideoTracks().forEach((track) => track.addEventListener('ended', stopRecording, { once: true }));
  recorder.start(1_000);
  maxDurationTimer = window.setTimeout(stopRecording, MAX_RECORDING_MS);
}

startButton?.addEventListener('click', () => {
  if (!Number.isInteger(tabId) || tabId < 0) {
    setMessage('未获取到要录制的页面，请关闭后重试。');
    return;
  }

  startButton.disabled = true;
  void chooseWindowStream()
    .then(createWindowStream)
    .then((stream) => {
      startRecording(stream);
      return chrome.runtime.sendMessage({ type: 'quick-copy/window-recording-started', tabId }) as Promise<RecordingSessionResponse>;
    })
    .then((response) => {
      if (!response.ok) {
        stopRecording();
        throw new Error(response.error);
      }
      return focusRecordingWindow();
    })
    .catch((error: unknown) => {
      startButton.disabled = false;
      setMessage(error instanceof Error ? error.message : '开始窗口录制失败。');
    });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'quick-copy/offscreen-stop-recording' && message.tabId === tabId) {
    stopRecording();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === 'quick-copy/offscreen-pause-recording' && message.tabId === tabId) {
    activeRecording?.recorder.pause();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === 'quick-copy/offscreen-resume-recording' && message.tabId === tabId) {
    activeRecording?.recorder.resume();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === 'quick-copy/offscreen-release-recording') {
    URL.revokeObjectURL(message.blobUrl);
    void chrome.windows.getCurrent().then((currentWindow) => {
      if (typeof currentWindow.id === 'number') {
        return chrome.windows.remove(currentWindow.id);
      }
      return undefined;
    });
    sendResponse({ ok: true });
    return false;
  }
  return false;
});
